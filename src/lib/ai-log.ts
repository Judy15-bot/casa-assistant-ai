import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Op } from "./home-ai";

type RawOp = {
  kind: string;
  item_id: string | null;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  location: string | null;
  expiry: string | null;
};
export type LogEdit = { op_index: number; kind: string; field: string; ai: unknown; user: unknown };

const ADD_FIELDS = ["name", "category", "quantity", "unit", "location", "expiry"] as const;

/**
 * 用户处理完确认卡片后更新日志。
 * 「是否修改」= 用户最终值与卡片初始值不同（即用户真的动过）；记录的 ai 值取模型原始输出 ai_output。
 * 记录失败只在控制台报错，不影响使用。
 */
export function resolveAiLog(args: {
  logId: string | null | undefined;
  rawOps: RawOp[] | undefined;
  initial: Op[];
  final: (Op & { off?: boolean })[];
  cancelledAll: boolean;
}) {
  const { logId, rawOps = [], initial, final, cancelledAll } = args;
  if (!logId) return;
  try {
    const edits: LogEdit[] = [];
    const editedIdx = new Set<number>();
    const finalOps: unknown[] = [];
    let confirmed = 0;
    let cancelled = 0;
    final.forEach((op, i) => {
      if (cancelledAll || op.off) {
        cancelled++;
        return;
      }
      confirmed++;
      const init = initial[i];
      const raw = rawOps[i];
      if (op.kind === "add" && init?.kind === "add") {
        for (const f of ADD_FIELDS) {
          const u = op.item[f] ?? null;
          const before = init.item[f] ?? null;
          if (u !== before) {
            edits.push({ op_index: i, kind: op.kind, field: f, ai: raw ? raw[f] : null, user: u });
            editedIdx.add(i);
          }
        }
        finalOps.push({ op_index: i, kind: "add", ...op.item });
      } else if (op.kind !== "add") {
        if (init && init.kind !== "add" && op.targetId !== init.targetId) {
          edits.push({ op_index: i, kind: op.kind, field: "item_id", ai: raw?.item_id ?? null, user: op.targetId ?? null });
          editedIdx.add(i);
        }
        finalOps.push({
          op_index: i,
          kind: op.kind,
          item_id: op.targetId ?? null,
          ...(op.kind === "update" ? { patch: op.patch } : {}),
        });
      }
    });
    const outcome = confirmed === 0 ? "all_cancelled" : cancelled === 0 ? "all_confirmed" : "partly_confirmed";
    void supabase
      .from("ai_logs")
      .update({
        outcome,
        confirmed_count: confirmed,
        cancelled_count: cancelled,
        edited_ops_count: editedIdx.size,
        edits: edits as unknown as Json,
        final_ops: finalOps as Json,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", logId)
      .then(({ error }) => {
        if (error) console.error("[ai_logs] update failed", error);
      }, (e) => console.error("[ai_logs] update failed", e));
  } catch (e) {
    console.error("[ai_logs] update failed", e);
  }
}
