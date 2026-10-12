// 图片识别评测打分：按"物品"逐件匹配，统计漏检、误检、字段错误和编造日期。
// 纯函数，不调用模型。

import type { AiOut } from "@/lib/ai.server";
import type { ExpectedImageItem, ImageCase, ImageScene } from "./image-cases";

export type ImageErrorTag =
  | "调用失败"
  | "漏检"
  | "误检"
  | "数量错误"
  | "品类错误"
  | "日期读错"
  | "日期漏读"
  | "编造日期"
  | "未提示重拍";

export const IMAGE_ERROR_TAGS: ImageErrorTag[] = [
  "调用失败",
  "漏检",
  "误检",
  "数量错误",
  "品类错误",
  "日期读错",
  "日期漏读",
  "编造日期",
  "未提示重拍",
];

export type ImageRun = { id: string; out: AiOut | null; error?: string; latency_ms?: number };

export type ImageScore = {
  id: string;
  scene: ImageScene;
  pass: boolean;
  errors: ImageErrorTag[];
  details: string[];
  /** 应识别出的物品数 / 模型识别出的物品数 / 两者匹配上的物品数 */
  expected: number;
  predicted: number;
  matched: number;
  /** 图上看不到日期、且物品已匹配上的件数，以及其中被编造了日期的件数 */
  noDateItems: number;
  fabricatedDates: number;
  /** 匹配上的物品中填错的字段数，以及其中被标为"不确定"的个数 */
  wrongFields: number;
  wrongFlagged: number;
  latency_ms?: number;
};

type ActualOp = AiOut["ops"][number];
const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/\s+/g, "");
const nameMatches = (exp: ExpectedImageItem, act: ActualOp) => {
  const a = norm(act.name);
  return a.length > 0 && exp.name.some((n) => a.includes(norm(n)) || norm(n).includes(a));
};

export function scoreImageCase(c: ImageCase, run: ImageRun): ImageScore {
  const base = {
    id: c.id,
    scene: c.scene,
    expected: c.expect.items.length,
    predicted: 0,
    matched: 0,
    noDateItems: 0,
    fabricatedDates: 0,
    wrongFields: 0,
    wrongFlagged: 0,
    latency_ms: run.latency_ms,
  };
  if (!run.out) {
    return { ...base, pass: false, errors: ["调用失败"], details: [run.error ?? "没有返回结果"] };
  }

  const adds = run.out.ops.filter((o) => o.kind === "add");
  const errors: ImageErrorTag[] = [];
  const details: string[] = [];

  if (c.expect.unreadable) {
    if (adds.length > 0) {
      errors.push("未提示重拍");
      details.push(`图片看不清，模型却识别出：${adds.map((a) => a.name).join("、")}`);
    }
    return { ...base, predicted: adds.length, pass: errors.length === 0, errors, details };
  }

  const used = new Set<number>();
  let matched = 0;
  let noDateItems = 0;
  let fabricatedDates = 0;
  let wrongFields = 0;
  let wrongFlagged = 0;

  for (const exp of c.expect.items) {
    const idx = adds.findIndex((a, i) => !used.has(i) && nameMatches(exp, a));
    if (idx < 0) {
      errors.push("漏检");
      details.push(`没有识别出「${exp.name[0]}」`);
      continue;
    }
    used.add(idx);
    matched++;
    const act = adds[idx]!;
    const flagged = (f: string) => act.low_confidence_fields.includes(f);

    if (exp.quantity && (act.quantity === null || !exp.quantity.includes(act.quantity))) {
      errors.push("数量错误");
      details.push(`「${act.name}」数量应为 ${exp.quantity.join(" 或 ")}，实际为 ${act.quantity ?? "空"}`);
      wrongFields++;
      if (flagged("quantity")) wrongFlagged++;
    }
    if (exp.category && act.category !== exp.category) {
      errors.push("品类错误");
      details.push(`「${act.name}」品类应为 ${exp.category}，实际为 ${act.category ?? "空"}`);
    }
    if (exp.expiry === null) {
      noDateItems++;
      if (act.expiry !== null && !flagged("expiry")) {
        errors.push("编造日期");
        details.push(`「${act.name}」图上看不到过期日，模型却填了 ${act.expiry} 且没标不确定`);
        fabricatedDates++;
        wrongFields++;
      }
    } else if (act.expiry === null) {
      errors.push("日期漏读");
      details.push(`「${act.name}」过期日应为 ${exp.expiry}，模型没有读出`);
    } else if (act.expiry !== exp.expiry) {
      errors.push("日期读错");
      details.push(`「${act.name}」过期日应为 ${exp.expiry}，实际为 ${act.expiry}`);
      wrongFields++;
      if (flagged("expiry")) wrongFlagged++;
    }
  }

  adds.forEach((a, i) => {
    if (!used.has(i)) {
      errors.push("误检");
      details.push(`多识别了「${a.name}」`);
    }
  });

  return {
    ...base,
    predicted: adds.length,
    matched,
    noDateItems,
    fabricatedDates,
    wrongFields,
    wrongFlagged,
    pass: errors.length === 0,
    errors: [...new Set(errors)],
    details,
  };
}

export type ImageSummary = {
  cases: number;
  passed: number;
  /** 召回率：应识别出的物品中，识别出了多少 */
  recall: number | null;
  /** 准确率：识别出的物品中，有多少是真的 */
  precision: number | null;
  /** 编造日期率：图上看不到日期的物品中，被编造了日期的比例 */
  fabricatedDateRate: number | null;
  /** 置信度覆盖率：填错的字段中，被标为不确定的比例 */
  wrongFlaggedRate: number | null;
  byError: Array<{ tag: ImageErrorTag; count: number }>;
  avgLatencyMs: number | null;
};

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function summarizeImages(scores: ImageScore[]): ImageSummary {
  const lat = scores.map((s) => s.latency_ms).filter((x): x is number => typeof x === "number");
  return {
    cases: scores.length,
    passed: scores.filter((s) => s.pass).length,
    recall: ratio(sum(scores.map((s) => s.matched)), sum(scores.map((s) => s.expected))),
    precision: ratio(sum(scores.map((s) => s.matched)), sum(scores.map((s) => s.predicted))),
    fabricatedDateRate: ratio(sum(scores.map((s) => s.fabricatedDates)), sum(scores.map((s) => s.noDateItems))),
    wrongFlaggedRate: ratio(sum(scores.map((s) => s.wrongFlagged)), sum(scores.map((s) => s.wrongFields))),
    byError: IMAGE_ERROR_TAGS.map((tag) => ({ tag, count: scores.filter((s) => s.errors.includes(tag)).length }))
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count),
    avgLatencyMs: lat.length ? Math.round(sum(lat) / lat.length) : null,
  };
}
