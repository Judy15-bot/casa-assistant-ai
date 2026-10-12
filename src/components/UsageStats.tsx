import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Edit = { op_index: number; kind: string; field: string; ai: unknown; user: unknown };
type Log = {
  id: string;
  created_at: string;
  input_type: string;
  input_text: string | null;
  has_image: boolean;
  prompt_version: string;
  latency_ms: number | null;
  ok: boolean;
  intent: string | null;
  outcome: string;
  confirmed_count: number | null;
  edited_ops_count: number | null;
  edits: unknown;
};

const RANGES = [
  { key: "7", label: "最近 7 天", days: 7 },
  { key: "30", label: "最近 30 天", days: 30 },
  { key: "all", label: "全部", days: null },
] as const;
const TYPES = ["文字", "语音", "拍照", "截图"] as const;
const INTENTS = [["record", "录入"], ["query", "查询"], ["chat", "闲聊"]] as const;
const OUTCOMES = [["all_confirmed", "全部确认"], ["partly_confirmed", "部分确认"], ["all_cancelled", "全部取消"], ["pending", "未处理"]] as const;
const FIELDS = [["name", "名称"], ["quantity", "数量"], ["location", "位置"], ["expiry", "过期日"], ["category", "品类"], ["item_id", "物品选择"]] as const;
const FIELD_LABEL: Record<string, string> = Object.fromEntries(FIELDS);

const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—");
const edits = (l: Log): Edit[] => (Array.isArray(l.edits) ? (l.edits as Edit[]) : []);
const fmt = (v: unknown) => (v == null || v === "" ? "空" : String(v));

function stats(logs: Log[]) {
  const n = logs.length;
  const ok = logs.filter((l) => l.ok).length;
  const lat = logs.map((l) => l.latency_ms).filter((x): x is number => typeof x === "number");
  const confirmed = logs.reduce((a, l) => a + (l.confirmed_count ?? 0), 0);
  const edited = logs.reduce((a, l) => a + (l.edited_ops_count ?? 0), 0);
  const recordLogs = logs.filter((l) => l.intent === "record");
  const fieldCount = Object.fromEntries(FIELDS.map(([f]) => [f, 0])) as Record<string, number>;
  for (const l of logs) for (const e of edits(l)) fieldCount[e.field] = (fieldCount[e.field] ?? 0) + 1;
  return {
    n,
    successRate: pct(ok, n),
    avgLatency: lat.length ? `${(lat.reduce((a, b) => a + b, 0) / lat.length / 1000).toFixed(2)}s` : "—",
    intents: INTENTS.map(([k, label]) => ({ label, count: logs.filter((l) => l.intent === k).length })),
    outcomes: OUTCOMES.map(([k, label]) => ({ label, count: recordLogs.filter((l) => l.outcome === k).length })),
    recordN: recordLogs.length,
    editRate: pct(edited, confirmed),
    edited,
    confirmed,
    fieldCount,
  };
}

const th = "px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap";
const td = "px-2 py-1.5 align-top whitespace-nowrap";

export function UsageStats() {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("7");
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    setLogs(null);
    const days = RANGES.find((r) => r.key === range)!.days;
    let q = supabase
      .from("ai_logs")
      .select("id,created_at,input_type,input_text,has_image,prompt_version,latency_ms,ok,intent,outcome,confirmed_count,edited_ops_count,edits")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (days) q = q.gte("created_at", new Date(Date.now() - days * 86400_000).toISOString());
    void q.then(({ data, error }) => {
      if (!alive) return;
      setErr(error ? error.message : "");
      setLogs((data ?? []) as Log[]);
    });
    return () => {
      alive = false;
    };
  }, [range]);

  const all = logs ? stats(logs) : null;
  const byType = logs ? TYPES.map((t) => ({ t, s: stats(logs.filter((l) => l.input_type === t)) })) : [];
  const versions = logs ? [...new Set(logs.map((l) => l.prompt_version))].sort() : [];
  const editedLogs = (logs ?? []).filter((l) => edits(l).length > 0).slice(0, 50);

  const cols: Array<{ label: string; s: NonNullable<typeof all> }> = all ? [{ label: "全部", s: all }, ...byType.map((x) => ({ label: x.t, s: x.s }))] : [];

  return (
    <section className="space-y-3 rounded-3xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">真实使用数据</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`rounded-full px-3 py-1 text-xs ${range === r.key ? "bg-primary text-primary-foreground" : "border"}`}>{r.label}</button>
          ))}
        </div>
      </div>
      {err && <p className="text-xs text-destructive">读取失败：{err}</p>}
      {!logs ? <p className="text-sm text-muted-foreground">加载中…</p> : logs.length === 0 ? <p className="text-sm text-muted-foreground">这个时间范围内还没有使用记录。</p> : (
        <>
          <p className="text-xs text-muted-foreground">确认卡片结果只统计意图为「录入」的调用；确认前修改率 = 被修改过的已确认操作 ÷ 已确认操作总数。</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr><th className={th}>指标</th>{cols.map((c) => <th key={c.label} className={th}>{c.label}</th>)}</tr></thead>
              <tbody>
                <Row label="调用次数" cols={cols} v={(s) => String(s.n)} />
                <Row label="成功率" cols={cols} v={(s) => s.successRate} />
                <Row label="平均耗时" cols={cols} v={(s) => s.avgLatency} />
                {INTENTS.map(([, label], i) => <Row key={label} label={`意图 · ${label}`} cols={cols} v={(s) => `${s.intents[i]!.count}（${pct(s.intents[i]!.count, s.n)}）`} />)}
                {OUTCOMES.map(([, label], i) => <Row key={label} label={`卡片 · ${label}`} cols={cols} v={(s) => `${s.outcomes[i]!.count}（${pct(s.outcomes[i]!.count, s.recordN)}）`} />)}
                <Row label="确认前修改率" cols={cols} v={(s) => `${s.editRate}（${s.edited}/${s.confirmed}）`} strong />
                {FIELDS.map(([f, label]) => <Row key={f} label={`改动 · ${label}`} cols={cols} v={(s) => String(s.fieldCount[f] ?? 0)} />)}
              </tbody>
            </table>
          </div>

          <h3 className="pt-2 text-sm font-medium">按 prompt 版本的确认前修改率</h3>
          <table className="w-full text-xs">
            <thead><tr><th className={th}>Prompt 版本</th><th className={th}>调用次数</th><th className={th}>修改率</th></tr></thead>
            <tbody>
              {versions.map((v) => {
                const s = stats(logs.filter((l) => l.prompt_version === v));
                return <tr key={v} className="border-t"><td className={td}>{v}</td><td className={td}>{s.n}</td><td className={td}>{s.editRate}（{s.edited}/{s.confirmed}）</td></tr>;
              })}
            </tbody>
          </table>

          <h3 className="pt-2 text-sm font-medium">最近被修改过的记录（{editedLogs.length}）</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr><th className={th}>时间</th><th className={th}>类型</th><th className={th}>输入</th><th className={th}>AI → 用户</th></tr></thead>
              <tbody>
                {editedLogs.length === 0 && <tr><td className={td} colSpan={4}>暂无</td></tr>}
                {editedLogs.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className={td}>{new Date(l.created_at).toLocaleString("zh-CN")}</td>
                    <td className={td}>{l.input_type}</td>
                    <td className="px-2 py-1.5 align-top">{l.input_text ?? ""}{l.has_image ? "（含图片）" : ""}</td>
                    <td className="px-2 py-1.5 align-top">
                      {edits(l).map((e, i) => (
                        <div key={i}>#{e.op_index + 1} {FIELD_LABEL[e.field] ?? e.field}：{fmt(e.ai)} → <b>{fmt(e.user)}</b></div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Row<S>({ label, cols, v, strong }: { label: string; cols: Array<{ label: string; s: S }>; v: (s: S) => string; strong?: boolean }) {
  return (
    <tr className={`border-t ${strong ? "font-semibold" : ""}`}>
      <td className={td}>{label}</td>
      {cols.map((c) => <td key={c.label} className={td}>{v(c.s)}</td>)}
    </tr>
  );
}
