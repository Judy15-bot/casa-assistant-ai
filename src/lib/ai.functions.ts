import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSystemPrompt, PROMPT_VERSION } from "./prompts";

const input = z.object({
  text: z.string().max(2000),
  image: z.string().max(6_000_000).nullable(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(12),
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
    if (error) return { ok: false as const, error: "读取物品失败" };

    const today = new Date().toISOString().slice(0, 10);
    const system = buildSystemPrompt(rows ?? [], today);

    const content: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
      { type: "text", text: data.text || "请识别图中的物品" },
    ];
    if (data.image) content.push({ type: "image", image: data.image });

    try {
      const out = await runHomeAi(system, [...data.history, { role: "user", content }]);
      return { ok: true as const, out, items: rows ?? [], prompt_version: PROMPT_VERSION, model: DEFAULT_MODEL };
    } catch (e) {
      return { ok: false as const, error: e instanceof AiError ? e.message : "AI 出错了" };
    }
  });
