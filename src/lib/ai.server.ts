import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText, type ModelMessage } from "ai";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
export const DEFAULT_MODEL = "openai/gpt-6-astra";

export const aiSchema = z.object({
  reply_text: z.string(),
  result_item_ids: z.array(z.string()),
  ops: z.array(
    z.object({
      kind: z.enum(["add", "update", "used_up"]),
      item_id: z.string().nullable(),
      name: z.string(),
      category: z.string().nullable(),
      quantity: z.number().nullable(),
      unit: z.string().nullable(),
      location: z.string().nullable(),
      expiry: z.string().nullable(),
      low_confidence_fields: z.array(z.string()),
    }),
  ),
});
export type AiOut = z.infer<typeof aiSchema>;

export class AiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function runHomeAi(
  system: string,
  messages: ModelMessage[],
  model: string = DEFAULT_MODEL,
): Promise<AiOut> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError(401, "AI 未配置");
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  let streamError: unknown;
  const result = streamText({
    model: provider.responses(model),
    system,
    messages,
    output: Output.object({ schema: aiSchema }),
    onError: ({ error }) => {
      streamError = error;
    },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  try {
    return (await result.output) as AiOut;
  } catch (e) {
    const err = (streamError ?? e) as { statusCode?: number; message?: string };
    const status = err?.statusCode;
    if (status === 402) throw new AiError(402, "AI 额度已用完，请在工作区设置中充值后再试。");
    if (status === 429) throw new AiError(429, "请求太频繁了，请稍后再试。");
    if (status === 403) throw new AiError(403, "AI 暂时不可用（访问被拒绝）。");
    if (NoObjectGeneratedError.isInstance(e)) throw new AiError(500, "AI 没给出有效结果，请换个说法再试。");
    console.error("AI error", e);
    throw new AiError(500, "AI 出错了，请稍后再试。");
  }
}
