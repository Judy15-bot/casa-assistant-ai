import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  text: z.string().max(2000),
  image: z.string().max(6_000_000).nullable(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(12),
});

export const askHomeAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { runHomeAi, AiError } = await import("./ai.server");
    const { data: rows, error } = await context.supabase
      .from("items")
      .select("id,name,category,quantity,unit,location,expiry")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return { ok: false as const, error: "读取物品失败" };

    const today = new Date().toISOString().slice(0, 10);
    const system = `你是家庭物品管理助手「家底」。今天是 ${today}。用中文简短回复。
用户家里的物品清单（JSON）：${JSON.stringify(rows)}

规则：
- 录入/购买 → ops 中加 kind=add，填 name/category(食品/调味品/日用品/药品/护肤品/其他)/quantity/unit/location/expiry(YYYY-MM-DD，只有月份则取当月1日)。不确定或缺失的字段放进 low_confidence_fields（可选值 quantity/location/expiry），缺失的 location 填 null。
- 移动位置、数量变化 → kind=update，item_id 填清单中匹配的 id；有多件同名而无法确定时 item_id=null，name 填物品名。只填要改的字段，其他为 null。
- 用完/吃完/扔了 → kind=used_up，规则同上。
- 一句话可包含多个操作。
- 查询（有没有、在哪、快过期、想买查重）→ ops 为空，result_item_ids 填相关物品 id，reply_text 给出简短回答。清单里没有就如实说没有，绝不编造。
- 图片：识别其中的物品（照片或订单截图），全部作为 add，看不清的字段标为低置信度。
- 闲聊或听不懂 → ops 和 result_item_ids 为空，reply_text 引导用户。
- 只能使用清单中真实存在的 id。`;

    const content: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
      { type: "text", text: data.text || "请识别图中的物品" },
    ];
    if (data.image) content.push({ type: "image", image: data.image });

    try {
      const out = await runHomeAi(system, [...data.history, { role: "user", content }]);
      return { ok: true as const, out, items: rows ?? [] };
    } catch (e) {
      return { ok: false as const, error: e instanceof AiError ? e.message : "AI 出错了" };
    }
  });
