import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSystemPrompt, PROMPT_VERSION } from "./prompts";
import type { Json } from "@/integrations/supabase/types";

const input = z.object({
  text: z.string().max(2000),
  image: z.string().max(6_000_000).nullable(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(12),
  input_type: z.enum(["文字", "语音", "拍照", "截图"]).default("文字"),
});

export const askHomeAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { runHomeAi, AiError, DEFAULT_MODEL } = await import("./ai.server");
    const { data: rows, error } = await context.supabase
      .from("items")
      .select("id,name,category,quantity,unit,location,expiry")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return { ok: false as const, error: "读取物品失败", log_id: null };

    const today = new Date().toISOString().slice(0, 10);
    const system = buildSystemPrompt(rows ?? [], today);

    const content: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
      { type: "text", text: data.text || "请识别图中的物品" },
    ];
    if (data.image) content.push({ type: "image", image: data.image });

    // 使用日志：写入失败只在服务器控制台报错，不影响返回结果。
    const writeLog = async (row: {
      latency_ms: number;
      ok: boolean;
      error?: string | null;
      intent?: "record" | "query" | "chat" | null;
      ai_output?: Json | null;
      ops_count?: number;
    }): Promise<string | null> => {
      try {
        const { data: log, error: logErr } = await context.supabase
          .from("ai_logs")
          .insert({
            user_id: context.userId,
            input_type: data.input_type,
            input_text: data.text || null,
            has_image: !!data.image,
            prompt_version: PROMPT_VERSION,
            model: DEFAULT_MODEL,
            ...row,
          })
          .select("id")
          .single();
        if (logErr) throw logErr;
        return log.id;
      } catch (e) {
        console.error("[ai_logs] insert failed", e);
        return null;
      }
    };

    const t0 = Date.now();
    try {
      const out = await runHomeAi(system, [...data.history, { role: "user", content }]);
      const intent = out.ops.length ? "record" : out.result_item_ids.length ? "query" : "chat";
      const log_id = await writeLog({
        latency_ms: Date.now() - t0,
        ok: true,
        intent,
        ai_output: out as unknown as Json,
        ops_count: out.ops.length,
      });
      return { ok: true as const, out, items: rows ?? [], prompt_version: PROMPT_VERSION, model: DEFAULT_MODEL, log_id };
    } catch (e) {
      const msg = e instanceof AiError ? e.message : "AI 出错了";
      const log_id = await writeLog({ latency_ms: Date.now() - t0, ok: false, error: msg });
      return { ok: false as const, error: msg, log_id };
    }
  });
