import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { NoObjectGeneratedError, Output, streamText, type ModelMessage } from "ai";
import { z } from "zod";
import { modelInfo } from "./model-prices";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
export const DEFAULT_MODEL = "openai/gpt-6-astra";

// 第三方服务商（仅评测使用）。DeepSeek 官方 OpenAI 兼容地址；Qwen 默认国际版（新加坡），
// 可通过 QWEN_BASE_URL 覆盖为国内版 https://dashscope.aliyuncs.com/compatible-mode/v1。
const DEEPSEEK_BASE = "https://api.deepseek.com";
const QWEN_BASE_INTL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

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
export type AiResult = { out: AiOut; input_tokens: number | null; output_tokens: number | null };

export class AiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// 不支持 JSON Schema 模式的服务商使用 json_object 模式：在系统提示词末尾说明输出格式，再用 zod 校验。
const JSON_FORMAT_HINT = `

只输出一个 JSON 对象，不要输出其他文字。格式：
{"reply_text": string, "result_item_ids": string[], "ops": [{"kind": "add"|"update"|"used_up", "item_id": string|null, "name": string, "category": string|null, "quantity": number|null, "unit": string|null, "location": string|null, "expiry": string|null, "low_confidence_fields": string[]}]}
所有字段都必须出现；没有的值填 null 或空数组。`;

const hasImage = (messages: ModelMessage[]) =>
  messages.some((m) => Array.isArray(m.content) && m.content.some((p) => (p as { type?: string }).type === "image"));

function mapError(e: unknown, streamError: unknown): never {
  if (e instanceof AiError) throw e;
  const err = (streamError ?? e) as { statusCode?: number; message?: string };
  const status = err?.statusCode;
  if (status === 401) throw new AiError(401, "API key 无效或未配置。");
  if (status === 402) throw new AiError(402, "AI 额度已用完，请在工作区设置中充值后再试。");
  if (status === 429) throw new AiError(429, "请求太频繁了，请稍后再试。");
  if (status === 403) throw new AiError(403, "AI 暂时不可用（访问被拒绝）。");
  if (NoObjectGeneratedError.isInstance(e)) throw new AiError(500, "AI 没给出有效结果，请换个说法再试。");
  console.error("AI error", e);
  throw new AiError(500, "AI 出错了，请稍后再试。");
}

export async function runHomeAi(system: string, messages: ModelMessage[], model: string = DEFAULT_MODEL): Promise<AiResult> {
  if (model.startsWith("deepseek/") || model.startsWith("qwen/")) return runCompatible(system, messages, model);

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
    const out = (await result.output) as AiOut;
    const usage = await result.usage;
    return { out, input_tokens: usage.inputTokens ?? null, output_tokens: usage.outputTokens ?? null };
  } catch (e) {
    mapError(e, streamError);
  }
}

// DeepSeek / Qwen：Chat Completions + json_object 模式 + zod 校验，不带 OpenAI 专属参数。
async function runCompatible(system: string, messages: ModelMessage[], model: string): Promise<AiResult> {
  const isDeepseek = model.startsWith("deepseek/");
  const info = modelInfo(model);
  if (hasImage(messages) && !info?.vision) throw new AiError(400, "该模型不支持图片");

  const apiKey = process.env[isDeepseek ? "DEEPSEEK_API_KEY" : "QWEN_API_KEY"];
  if (!apiKey) throw new AiError(401, `未配置 ${isDeepseek ? "DEEPSEEK_API_KEY" : "QWEN_API_KEY"}`);
  const provider = createOpenAICompatible({
    name: isDeepseek ? "deepseek" : "qwen",
    baseURL: isDeepseek ? DEEPSEEK_BASE : (process.env["QWEN_BASE_URL"] || QWEN_BASE_INTL),
    apiKey,
    supportsStructuredOutputs: false,
  });
  let streamError: unknown;
  const result = streamText({
    model: provider.chatModel(model.slice(model.indexOf("/") + 1)),
    system: system + JSON_FORMAT_HINT,
    messages,
    providerOptions: { [isDeepseek ? "deepseek" : "qwen"]: { response_format: { type: "json_object" } } },
    onError: ({ error }) => {
      streamError = error;
    },
  });
  try {
    const text = await result.text;
    if (streamError) throw streamError;
    const usage = await result.usage;
    const json = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new AiError(500, "模型返回的不是合法 JSON");
    }
    const r = aiSchema.safeParse(parsed);
    if (!r.success) throw new AiError(500, "模型返回的 JSON 不符合格式要求");
    return { out: r.data, input_tokens: usage.inputTokens ?? null, output_tokens: usage.outputTokens ?? null };
  } catch (e) {
    mapError(e, streamError);
  }
}
