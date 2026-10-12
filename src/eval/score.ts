// 评测打分：把模型（或正则基线）的输出和用例的期望结果对比，给出是否通过和出错类别。
// 纯函数，不调用模型、不碰数据库，可以在浏览器或测试里直接运行。

import type { AiOut } from "@/lib/ai.server";
import type { CaseGroup, EvalCase, ExpectedOp } from "./cases";
import { EVAL_ITEMS } from "./fixtures";

export type ErrorTag =
  | "调用失败"
  | "意图错误"
  | "操作数量错误"
  | "匹配错物品"
  | "名称错误"
  | "数量错误"
  | "位置错误"
  | "日期错误"
  | "品类错误"
  | "置信度未标出"
  | "查询结果错误"
  | "幻觉";

export const ERROR_TAGS: ErrorTag[] = [
  "调用失败",
  "意图错误",
  "操作数量错误",
  "匹配错物品",
  "名称错误",
  "数量错误",
  "位置错误",
  "日期错误",
  "品类错误",
  "置信度未标出",
  "查询结果错误",
  "幻觉",
];

/** 一条用例的一次运行结果。out 为 null 表示调用失败。 */
export type CaseRun = { id: string; out: AiOut | null; error?: string; latency_ms?: number };

export type CaseScore = {
  id: string;
  kind: EvalCase["kind"];
  group: CaseGroup;
  input: string;
  pass: boolean;
  errors: ErrorTag[];
  details: string[];
  latency_ms?: number | undefined;
};

type ActualOp = AiOut["ops"][number];

const KIND_LABEL: Record<ExpectedOp["kind"], string> = { add: "新增", update: "更新", used_up: "用完" };
const VALID_IDS = new Set(EVAL_ITEMS.map((i) => i.id));
const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/\s+/g, "");

function checkOp(exp: ExpectedOp, act: ActualOp): { errors: ErrorTag[]; details: string[] } {
  const errors: ErrorTag[] = [];
  const details: string[] = [];
  const label = KIND_LABEL[exp.kind];

  if ("item_id" in exp) {
    if (exp.item_id === null && act.item_id !== null) {
      errors.push("匹配错物品");
      details.push(`${label}：应当不确定是哪一件（item_id 为空），实际直接选了 ${act.item_id}`);
    } else if (exp.item_id !== null && act.item_id !== exp.item_id) {
      errors.push("匹配错物品");
      details.push(`${label}：应匹配 ${exp.item_id}，实际为 ${act.item_id ?? "空"}`);
    }
  }
  if (exp.name) {
    const a = norm(act.name);
    const ok = a.length > 0 && exp.name.some((n) => a.includes(norm(n)) || norm(n).includes(a));
    if (!ok) {
      errors.push("名称错误");
      details.push(`${label}：名称应为「${exp.name.join("/")}」，实际为「${act.name}」`);
    }
  }
  if (exp.quantity !== undefined) {
    const allowed = Array.isArray(exp.quantity) ? exp.quantity : [exp.quantity];
    if (act.quantity === null || !allowed.includes(act.quantity)) {
      errors.push("数量错误");
      details.push(`${label}：数量应为 ${allowed.join(" 或 ")}，实际为 ${act.quantity ?? "空"}`);
    }
  }
  if (exp.location) {
    const a = norm(act.location);
    if (!a || !exp.location.some((l) => a.includes(norm(l)))) {
      errors.push("位置错误");
      details.push(`${label}：位置应包含「${exp.location.join("/")}」，实际为「${act.location ?? "空"}」`);
    }
  }
  if (exp.expiry !== undefined && act.expiry !== exp.expiry) {
    errors.push("日期错误");
    details.push(`${label}：过期日应为 ${exp.expiry}，实际为 ${act.expiry ?? "空"}`);
  }
  if (exp.category !== undefined && act.category !== exp.category) {
    errors.push("品类错误");
    details.push(`${label}：品类应为 ${exp.category}，实际为 ${act.category ?? "空"}`);
  }
  for (const f of exp.low_conf ?? []) {
    if (act[f] !== null && !act.low_confidence_fields.includes(f)) {
      errors.push("置信度未标出");
      details.push(`${label}：「${f}」应标为不确定，实际直接填了 ${String(act[f])}`);
    }
  }
  return { errors, details };
}

const kindsKey = (kinds: string[]) => [...kinds].sort().join(",");

function scoreRecord(c: EvalCase, out: AiOut): { errors: ErrorTag[]; details: string[] } {
  const exp = c.expect.ops;
  const act = out.ops;
  if (act.length === 0) {
    return { errors: ["意图错误"], details: ["应为录入操作，实际被当成了查询或闲聊（没有生成任何操作）"] };
  }
  if (kindsKey(exp.map((o) => o.kind)) !== kindsKey(act.map((o) => o.kind))) {
    const want = exp.map((o) => KIND_LABEL[o.kind]).join("+");
    const got = act.map((o) => KIND_LABEL[o.kind]).join("+");
    const tag: ErrorTag = exp.length !== act.length ? "操作数量错误" : "意图错误";
    return { errors: [tag], details: [`操作应为「${want}」，实际为「${got}」`] };
  }

  // 操作类型一致：逐条为期望操作找到最匹配的实际操作（不计顺序）。
  const used = new Set<number>();
  const errors: ErrorTag[] = [];
  const details: string[] = [];
  for (const e of exp) {
    let best: { idx: number; r: ReturnType<typeof checkOp> } | null = null;
    act.forEach((a, idx) => {
      if (used.has(idx) || a.kind !== e.kind) return;
      const r = checkOp(e, a);
      if (!best || r.errors.length < best.r.errors.length) best = { idx, r };
    });
    if (!best) continue; // 类型数量已校验一致，这里不会发生
    const b: { idx: number; r: ReturnType<typeof checkOp> } = best;
    used.add(b.idx);
    errors.push(...b.r.errors);
    details.push(...b.r.details);
  }
  return { errors, details };
}

function scoreQuery(c: EvalCase, out: AiOut): { errors: ErrorTag[]; details: string[] } {
  if (out.ops.length > 0) {
    const got = out.ops.map((o) => KIND_LABEL[o.kind]).join("+");
    return { errors: ["意图错误"], details: [`应为查询，实际生成了写操作「${got}」`] };
  }
  const want = new Set(c.expect.results ?? []);
  const got = new Set(out.result_item_ids);
  const invalid = [...got].filter((id) => !VALID_IDS.has(id));
  if (invalid.length) {
    return { errors: ["幻觉"], details: [`返回了清单中不存在的 id：${invalid.join(", ")}`] };
  }
  if (want.size === 0 && got.size > 0) {
    return { errors: ["幻觉"], details: [`清单里没有相关物品，却返回了 ${[...got].join(", ")}`] };
  }
  const missing = [...want].filter((id) => !got.has(id));
  const extra = [...got].filter((id) => !want.has(id));
  if (missing.length || extra.length) {
    const parts = [];
    if (missing.length) parts.push(`漏了 ${missing.join(", ")}`);
    if (extra.length) parts.push(`多了 ${extra.join(", ")}`);
    return { errors: ["查询结果错误"], details: [parts.join("；")] };
  }
  return { errors: [], details: [] };
}

export function scoreCase(c: EvalCase, run: CaseRun): CaseScore {
  const base = { id: c.id, kind: c.kind, group: c.group, input: c.input, latency_ms: run.latency_ms };
  if (!run.out) {
    return { ...base, pass: false, errors: ["调用失败"], details: [run.error ?? "没有返回结果"] };
  }
  const r = c.kind === "record" ? scoreRecord(c, run.out) : scoreQuery(c, run.out);
  return { ...base, pass: r.errors.length === 0, errors: [...new Set(r.errors)], details: r.details };
}

export type Tally = { total: number; passed: number; accuracy: number };
const tally = (xs: CaseScore[]): Tally => {
  const passed = xs.filter((x) => x.pass).length;
  return { total: xs.length, passed, accuracy: xs.length ? passed / xs.length : 0 };
};

export type EvalSummary = {
  overall: Tally;
  record: Tally;
  query: Tally;
  byGroup: Array<{ group: CaseGroup } & Tally>;
  byError: Array<{ tag: ErrorTag; count: number }>;
  avgLatencyMs: number | null;
};

export function summarize(scores: CaseScore[]): EvalSummary {
  const groups = [...new Set(scores.map((s) => s.group))];
  const byError = ERROR_TAGS.map((tag) => ({ tag, count: scores.filter((s) => s.errors.includes(tag)).length })).filter(
    (e) => e.count > 0,
  );
  const lat = scores.map((s) => s.latency_ms).filter((x): x is number => typeof x === "number");
  return {
    overall: tally(scores),
    record: tally(scores.filter((s) => s.kind === "record")),
    query: tally(scores.filter((s) => s.kind === "query")),
    byGroup: groups.map((group) => ({ group, ...tally(scores.filter((s) => s.group === group)) })),
    byError: byError.sort((a, b) => b.count - a.count),
    avgLatencyMs: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null,
  };
}
