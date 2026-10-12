// 评测用模型清单与价格表（美元 / 每百万 token）。
// 价格均为官方标价、不含缓存命中折扣与促销；长文本分档时取最低一档（本应用单次请求远小于该档上限）。
//
// 来源（查询日期 2026-10-12）：
// - DeepSeek: https://api-docs.deepseek.com/quick_start/pricing
//   deepseek-flash 分高峰/非高峰：高峰 input(cache miss) $0.30 / output $1.20，非高峰减半。
//   这里按高峰价填写（保守估算）。高峰时段：周一至周五 UTC 01:00–04:00 与 06:00–10:00。
// - Qwen（阿里云百炼国际版 / 新加坡）: https://www.alibabacloud.com/help/en/model-studio/model-pricing
//   qwen-plus 非思考模式 0–256K：input $0.4 / output $1.2
//   qwen3-vl-plus 0–32K：input $0.2 / output $1.6
//   若使用国内版（北京）接口，价格不同，请以控制台为准。
// - 默认模型 openai/gpt-6-astra 走 Lovable AI 通道，按 Lovable 额度计费，没有公开的美元单价，填 null（页面显示「—」）。

export type ModelInfo = {
  id: string;
  label: string;
  /** 每百万 token 美元价格；null 表示未知 */
  input: number | null;
  output: number | null;
  vision: boolean;
};

export const EVAL_MODELS: ModelInfo[] = [
  { id: "openai/gpt-6-astra", label: "默认模型（gpt-6-astra）", input: null, output: null, vision: true },
  { id: "deepseek/deepseek-flash", label: "DeepSeek（deepseek-flash）", input: 0.3, output: 1.2, vision: true },
  { id: "qwen/qwen-plus", label: "Qwen 文字（qwen-plus）", input: 0.4, output: 1.2, vision: false },
  { id: "qwen/qwen3-vl-plus", label: "Qwen 视觉（qwen3-vl-plus）", input: 0.2, output: 1.6, vision: true },
];

export const modelInfo = (id: string) => EVAL_MODELS.find((m) => m.id === id);

/** 根据 token 数计算成本（美元）；价格未知或无用量时返回 null */
export function costUsd(model: string, input_tokens: number | null | undefined, output_tokens: number | null | undefined) {
  const m = modelInfo(model);
  if (!m || m.input == null || m.output == null || input_tokens == null || output_tokens == null) return null;
  return (input_tokens * m.input + output_tokens * m.output) / 1_000_000;
}
