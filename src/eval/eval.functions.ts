// 评测用的服务器函数：在服务器上用固定清单和固定日期调用大模型，返回原始输出。
// 不读写 items 表。为避免单次请求超时，前端每次只发一小批用例（最多 10 条）。

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSystemPrompt, PROMPT_VERSION } from "@/lib/prompts";
import { EVAL_CASES } from "./cases";
import { EVAL_ITEMS, EVAL_TODAY } from "./fixtures";
import type { ImageRun } from "./image-score";
import type { CaseRun } from "./score";

const input = z.object({
  caseIds: z.array(z.string().max(10)).min(1).max(10),
  model: z.string().min(1).max(100).optional(),
});

export const runEvalBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const { runHomeAi, AiError, DEFAULT_MODEL } = await import("@/lib/ai.server");
    const model = data.model ?? DEFAULT_MODEL;
    const system = buildSystemPrompt(EVAL_ITEMS, EVAL_TODAY);
    const cases = EVAL_CASES.filter((c) => data.caseIds.includes(c.id));

    const runs: CaseRun[] = await Promise.all(
      cases.map(async (c): Promise<CaseRun> => {
        const t0 = Date.now();
        try {
          const out = await runHomeAi(system, [{ role: "user", content: [{ type: "text", text: c.input }] }], model);
          return { id: c.id, out, latency_ms: Date.now() - t0 };
        } catch (e) {
          const error = e instanceof AiError ? e.message : "AI 出错了";
          return { id: c.id, out: null, error, latency_ms: Date.now() - t0 };
        }
      }),
    );

    return { prompt_version: PROMPT_VERSION, model, runs };
  });

// 图片评测：一次一张图。前端从 /eval-images/ 读取图片并转成 data URL 传进来，
// 服务器用和产品里完全相同的方式（固定提示语"请识别图中的物品"）调用模型。
const imageInput = z.object({
  caseId: z.string().max(10),
  image: z.string().max(6_000_000),
  model: z.string().min(1).max(100).optional(),
});

export const runImageEval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => imageInput.parse(d))
  .handler(async ({ data }) => {
    const { runHomeAi, AiError, DEFAULT_MODEL } = await import("@/lib/ai.server");
    const model = data.model ?? DEFAULT_MODEL;
    const system = buildSystemPrompt(EVAL_ITEMS, EVAL_TODAY);
    const t0 = Date.now();
    try {
      const out = await runHomeAi(
        system,
        [{ role: "user", content: [{ type: "text", text: "请识别图中的物品" }, { type: "image", image: data.image }] }],
        model,
      );
      const run: ImageRun = { id: data.caseId, out, latency_ms: Date.now() - t0 };
      return { prompt_version: PROMPT_VERSION, model, run };
    } catch (e) {
      const error = e instanceof AiError ? e.message : "AI 出错了";
      const run: ImageRun = { id: data.caseId, out: null, error, latency_ms: Date.now() - t0 };
      return { prompt_version: PROMPT_VERSION, model, run };
    }
  });
