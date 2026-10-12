// 正则基线：用项目最早的规则解析器（src/lib/home-ai.ts 的 parse）跑同一套评测集，
// 把它的输出转换成与大模型相同的格式，用来和大模型做对比。
// 不调用模型，可以直接在浏览器里运行。
// 注意：规则解析器计算"今天"用的是真实日期，而不是 EVAL_TODAY，过期类和相对日期类用例会受当天日期影响。

import type { AiOut } from "@/lib/ai.server";
import { parse, type Item } from "@/lib/home-ai";
import type { EvalCase } from "./cases";
import { EVAL_ITEMS } from "./fixtures";
import type { CaseRun } from "./score";

const items: Item[] = EVAL_ITEMS.map((i) => ({
  id: i.id,
  name: i.name,
  category: i.category ?? "日用品",
  quantity: i.quantity ?? 1,
  unit: i.unit ?? "个",
  location: i.location ?? "未指定",
  expiry: i.expiry ?? undefined,
  source: "文字",
  createdAt: "",
}));

const empty = {
  item_id: null,
  category: null,
  quantity: null,
  unit: null,
  location: null,
  expiry: null,
  low_confidence_fields: [] as string[],
};

export function runBaseline(c: EvalCase): CaseRun {
  const t0 = performance.now();
  const reply = parse(c.input, items);
  const out: AiOut = { reply_text: "", result_item_ids: [], ops: [] };

  if (reply.type === "text") out.reply_text = reply.text;
  if (reply.type === "results") {
    out.reply_text = reply.text;
    out.result_item_ids = reply.items.map((i: Item) => i.id);
  }
  if (reply.type === "confirm") {
    for (const op of reply.ops) {
      if (op.kind === "add") {
        out.ops.push({
          ...empty,
          kind: "add",
          name: op.item.name,
          category: op.item.category,
          quantity: op.item.quantity,
          unit: op.item.unit,
          // 规则解析器把缺失的位置写成"未指定"，这里还原为空，和大模型的约定一致
          location: op.item.location === "未指定" ? null : op.item.location,
          expiry: op.item.expiry ?? null,
          low_confidence_fields: op.lowConf,
        });
      } else if (op.kind === "update") {
        out.ops.push({
          ...empty,
          kind: "update",
          item_id: op.targetId ?? null,
          name: op.label,
          quantity: op.patch.quantity ?? null,
          location: op.patch.location ?? null,
        });
      } else {
        out.ops.push({ ...empty, kind: "used_up", item_id: op.targetId ?? null, name: op.label });
      }
    }
  }
  return { id: c.id, out, latency_ms: Math.round(performance.now() - t0) };
}
