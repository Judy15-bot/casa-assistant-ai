import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SubHeader } from "@/components/HeaderActions";
import { UsageStats } from "@/components/UsageStats";
import { PROMPT_VERSION } from "@/lib/prompts";
import { EVAL_CASES } from "@/eval/cases";
import { IMAGE_CASES } from "@/eval/image-cases";
import { scoreCase, summarize, type CaseRun, type CaseScore, type EvalSummary } from "@/eval/score";
import { scoreImageCase, summarizeImages, type ImageRun, type ImageScore, type ImageSummary } from "@/eval/image-score";
import { runBaseline } from "@/eval/baseline";
import { runEvalBatch, runImageEval } from "@/eval/eval.functions";
import type { Json } from "@/integrations/supabase/types";
import { EVAL_MODELS, costCredits } from "@/lib/model-prices";

type Usage = { input_tokens?: number | null; output_tokens?: number | null; cost_usd?: number | null };
type Extra = { avgLatencyMs: number | null; p90LatencyMs: number | null; avgCostUsd: number | null; costPer1kUsd: number | null; calls: number };
function extras(scores: Array<{ latency_ms?: number | undefined } & Usage>): Extra {
  const lat = scores.map((s) => s.latency_ms).filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
  const costs = scores.map((s) => s.cost_usd).filter((x): x is number => typeof x === "number");
  const avgCost = costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : null;
  return {
    calls: scores.length,
    avgLatencyMs: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null,
    p90LatencyMs: lat.length ? lat[Math.min(lat.length - 1, Math.ceil(lat.length * 0.9) - 1)]! : null,
    avgCostUsd: avgCost,
    costPer1kUsd: avgCost == null ? null : avgCost * 1000,
  };
}
const usd = (v: number | null | undefined, d = 4) => (v == null ? "—" : `$${v.toFixed(d)}`);
function credits1k(r: { model: string; scores: unknown }) {
  const v = (Array.isArray(r.scores) ? r.scores : []).map((s: any) => costCredits(r.model, s?.input_tokens, s?.output_tokens)).filter((x): x is number => x != null);
  return v.length ? `${((v.reduce((a, b) => a + b, 0) / v.length) * 1000).toFixed(1)} 额度` : "—";
}
function avgTok(r: { scores: unknown }, k: "input_tokens" | "output_tokens") {
  const v = (Array.isArray(r.scores) ? r.scores : []).map((s: any) => s?.[k]).filter((x: unknown): x is number => typeof x === "number");
  return v.length ? String(Math.round(v.reduce((a, b) => a + b, 0) / v.length)) : "—";
}

// 仅用于页面显示；真正的默认值由服务器端 DEFAULT_MODEL 决定，跑完后以返回值为准。
const DEFAULT_MODEL_LABEL = "openai/gpt-6-astra";

export const Route = createFileRoute("/eval")({
  head: () => ({
    meta: [
      { title: "评测 · 家底" },
      { name: "description", content: "内部评测：批量测量 AI 助手准确率。" },
      { property: "og:title", content: "评测 · 家底" },
      { property: "og:description", content: "内部评测：批量测量 AI 助手准确率。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EvalPage,
});

type Kind = "text" | "image" | "baseline";
type TextScore = CaseScore & Usage & { raw?: unknown };
type ImgScore = ImageScore & Usage & { raw?: unknown; file: string };
type RunRow = {
  id: string;
  created_at: string;
  kind: Kind;
  model: string;
  prompt_version: string;
  summary: any;
  scores: any;
};

const pct = (v: number | null | undefined) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
const ms = (v: number | null | undefined) => (v == null ? "—" : `${(v / 1000).toFixed(2)}s`);
const KIND_LABEL: Record<Kind, string> = { text: "文字", image: "图片", baseline: "正则基线" };

async function toDataUrl(file: string) {
  const blob = await (await fetch(`/eval-images/${file}`)).blob();
  return await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

function EvalPage() {
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [lastModel, setLastModel] = useState<string | null>(null);
  const [repeat, setRepeat] = useState(1);
  const [stability, setStability] = useState<string[]>([]);
  const [text, setText] = useState<{ scores: TextScore[]; summary: EvalSummary } | null>(null);
  const [base, setBase] = useState<{ scores: TextScore[]; summary: EvalSummary } | null>(null);
  const [img, setImg] = useState<{ scores: ImgScore[]; summary: ImageSummary } | null>(null);
  const [history, setHistory] = useState<RunRow[]>([]);
  const [saveMsg, setSaveMsg] = useState("");

  const loadHistory = async () => {
    const { data } = await supabase.from("eval_runs").select("*").order("created_at", { ascending: false }).limit(100);
    setHistory((data ?? []) as RunRow[]);
  };
  useEffect(() => {
    void loadHistory();
  }, []);

  const save = async (kind: Kind, m: string, summary: unknown, scores: unknown) => {
    const { error } = await supabase.from("eval_runs").insert({
      kind,
      model: m,
      prompt_version: PROMPT_VERSION,
      summary: { ...(summary as object), extra: extras(scores as TextScore[]) } as unknown as Json,
      scores: scores as Json,
    });
    setSaveMsg(error ? `保存失败：${error.message}` : "已保存到历史记录");
    await loadHistory();
  };

  const m = model.trim() || undefined;

  const runText = async () => {
    setBusy("text");
    setStability([]);
    for (let rep = 1; rep <= repeat; rep++) {
      const acc = await runTextOnce(rep);
      setStability((s) => [...s, `第 ${rep} 轮：${pct(acc)}`]);
    }
    setBusy(null);
  };

  const runTextOnce = async (rep: number) => {
    const tag = repeat > 1 ? `第 ${rep}/${repeat} 轮 · ` : "";
    const runs: Array<CaseRun & Usage> = [];
    let usedModel = m ?? DEFAULT_MODEL_LABEL;
    for (let i = 0; i < EVAL_CASES.length; i += 5) {
      const batch = EVAL_CASES.slice(i, i + 5);
      setProgress(`${tag}已完成 ${i}/${EVAL_CASES.length}`);
      try {
        const r = await runEvalBatch({ data: { caseIds: batch.map((c) => c.id), ...(m ? { model: m } : {}) } });
        usedModel = r.model;
        runs.push(...r.runs);
      } catch (e) {
        for (const c of batch) runs.push({ id: c.id, out: null, error: e instanceof Error ? e.message : "请求失败" });
      }
    }
    setProgress(`${tag}已完成 ${EVAL_CASES.length}/${EVAL_CASES.length}`);
    const scores: TextScore[] = EVAL_CASES.map((c) => {
      const run = runs.find((r) => r.id === c.id) ?? { id: c.id, out: null, error: "无返回" };
      return { ...scoreCase(c, run), input_tokens: run.input_tokens ?? null, output_tokens: run.output_tokens ?? null, cost_usd: run.cost_usd ?? null, raw: run.out ?? run.error ?? null };
    });
    const summary = summarize(scores);
    setText({ scores, summary });
    setLastModel(usedModel);
    await save("text", usedModel, summary, scores);
    return summary.overall.accuracy;
  };

  const runImages = async () => {
    setBusy("image");
    setStability([]);
    for (let rep = 1; rep <= repeat; rep++) {
      const s = await runImagesOnce(rep);
      setStability((x) => [...x, `第 ${rep} 轮：通过 ${s.passed}/${s.cases}`]);
    }
    setBusy(null);
  };

  const runImagesOnce = async (rep: number) => {
    const tag = repeat > 1 ? `第 ${rep}/${repeat} 轮 · ` : "";
    const scores: ImgScore[] = [];
    let usedModel = m ?? DEFAULT_MODEL_LABEL;
    for (let i = 0; i < IMAGE_CASES.length; i++) {
      const c = IMAGE_CASES[i]!;
      setProgress(`${tag}已完成 ${i}/${IMAGE_CASES.length}`);
      let run: ImageRun & Usage;
      try {
        const image = await toDataUrl(c.file);
        const r = await runImageEval({ data: { caseId: c.id, image, ...(m ? { model: m } : {}) } });
        usedModel = r.model;
        run = r.run;
      } catch (e) {
        run = { id: c.id, out: null, error: e instanceof Error ? e.message : "请求失败" };
      }
      scores.push({ ...scoreImageCase(c, run), input_tokens: run.input_tokens ?? null, output_tokens: run.output_tokens ?? null, cost_usd: run.cost_usd ?? null, raw: run.out ?? run.error ?? null, file: c.file });
    }
    setProgress(`${tag}已完成 ${IMAGE_CASES.length}/${IMAGE_CASES.length}`);
    const summary = summarizeImages(scores);
    setImg({ scores, summary });
    setLastModel(usedModel);
    await save("image", usedModel, summary, scores);
    return summary;
  };

  const runBase = async () => {
    setBusy("baseline");
    const scores: TextScore[] = EVAL_CASES.map((c) => {
      let run: CaseRun;
      try {
        run = runBaseline(c);
      } catch (e) {
        run = { id: c.id, out: null, error: e instanceof Error ? e.message : "基线出错" };
      }
      return { ...scoreCase(c, run), raw: run.out ?? run.error ?? null };
    });
    setProgress(`已完成 ${EVAL_CASES.length}/${EVAL_CASES.length}`);
    const summary = summarize(scores);
    setBase({ scores, summary });
    await save("baseline", "regex-baseline", summary, scores);
    setBusy(null);
  };

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-background pb-16">
      <SubHeader title="评测（开发者）" />
      <main className="space-y-5 px-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-secondary px-3 py-1">Prompt 版本：{PROMPT_VERSION}</span>
          <span className="rounded-full bg-secondary px-3 py-1">模型：{lastModel ?? (m || `${DEFAULT_MODEL_LABEL}（默认）`)}</span>
        </div>

        <section className="space-y-3 rounded-3xl border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block text-sm">
              模型
              <select value={model} onChange={(e) => setModel(e.target.value)}
                className="mt-1 w-full rounded-2xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                <option value="">默认模型（{DEFAULT_MODEL_LABEL}）</option>
                {EVAL_MODELS.filter((x) => x.id !== DEFAULT_MODEL_LABEL).map((x) => (
                  <option key={x.id} value={x.id}>{x.label}{x.vision ? "" : " · 不支持图片"}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              重复次数
              <select value={repeat} onChange={(e) => setRepeat(Number(e.target.value))}
                className="mt-1 w-full rounded-2xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                <option value={1}>1 次</option>
                <option value={3}>3 次</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn disabled={!!busy} onClick={runText}>跑文字评测（{EVAL_CASES.length} 条）</Btn>
            <Btn disabled={!!busy} onClick={runImages}>跑图片评测（{IMAGE_CASES.length} 张）</Btn>
            <Btn disabled={!!busy} onClick={runBase}>跑正则基线</Btn>
          </div>
          {(busy || progress) && <p className="text-sm text-muted-foreground">{busy ? "运行中 · " : ""}{progress}</p>}
          {stability.length > 1 && <p className="text-xs">稳定性：{stability.join("；")}</p>}
          {saveMsg && <p className="text-xs text-muted-foreground">{saveMsg}</p>}
        </section>

        {text && <TextResult title="文字评测结果" data={text} />}
        {base && <TextResult title="正则基线结果" note="基线计算日期用的是真实的今天，过期类用例仅供参考" data={base} />}
        {img && <ImageResult data={img} />}

        <UsageStats />

        <History rows={history} onDeleted={loadHistory} />
      </main>
    </div>
  );
}

function Btn(p: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button disabled={p.disabled} onClick={p.onClick}
      className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 active:scale-95">
      {p.children}
    </button>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-bold">{value}</p>
    </div>
  );
}

const th = "px-2 py-1.5 text-left font-medium text-muted-foreground";
const td = "px-2 py-1.5 align-top";

function ExtraCards({ e }: { e: Extra | undefined }) {
  if (!e) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Card label="平均耗时" value={ms(e.avgLatencyMs)} />
      <Card label="P90 耗时" value={ms(e.p90LatencyMs)} />
      <Card label="平均每次调用成本" value={usd(e.avgCostUsd, 6)} />
      <Card label="每 1000 次调用估算" value={usd(e.costPer1kUsd, 3)} />
    </div>
  );
}

function TextSummaryCards({ s }: { s: EvalSummary }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Card label="总体准确率" value={pct(s.overall.accuracy)} />
      <Card label="录入准确率" value={`${s.record.passed}/${s.record.total} · ${pct(s.record.accuracy)}`} />
      <Card label="查询准确率" value={`${s.query.passed}/${s.query.total} · ${pct(s.query.accuracy)}`} />
      <Card label="平均耗时" value={ms(s.avgLatencyMs)} />
    </div>
  );
}

function ResultSection({ title, note, brief, data, children }: { title: string; note?: string | undefined; brief: string; data: unknown; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    setOpen(true);
  }, [data]);
  return (
    <section className="space-y-3 rounded-3xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {!open && <p className="mt-0.5 truncate text-xs text-muted-foreground">{brief}</p>}
        </div>
        <button onClick={() => setOpen(!open)} aria-label={open ? "收起结果" : "展开结果"}
          className="shrink-0 rounded-full border px-3 py-1 text-xs">{open ? "收起" : "展开"}</button>
      </div>
      {note && <p className="rounded-xl bg-warn/10 px-3 py-2 text-xs text-warn">{note}</p>}
      {open && <div className="space-y-3">{children}</div>}
    </section>
  );
}

function TextResult({ title, note, data }: { title: string; note?: string; data: { scores: TextScore[]; summary: EvalSummary } }) {
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const s = data.summary;
  const list = all ? data.scores : data.scores.filter((x) => !x.pass);
  const failed = data.scores.filter((x) => !x.pass).length;
  return (
    <ResultSection title={title} note={note} data={data}
      brief={`总体 ${pct(s.overall.accuracy)} · 失败 ${failed}/${data.scores.length} · 平均 ${ms(s.avgLatencyMs)}`}>
      <TextSummaryCards s={s} />
      <ExtraCards e={extras(data.scores)} />

      <div className="grid gap-3 sm:grid-cols-2">
        <table className="w-full text-xs">
          <thead><tr><th className={th}>分组</th><th className={th}>通过/总数</th><th className={th}>准确率</th></tr></thead>
          <tbody>
            {[...s.byGroup].sort((a, b) => a.accuracy - b.accuracy).map((g) => (
              <tr key={g.group} className="border-t"><td className={td}>{g.group}</td><td className={td}>{g.passed}/{g.total}</td><td className={td}>{pct(g.accuracy)}</td></tr>
            ))}
          </tbody>
        </table>
        <table className="w-full text-xs">
          <thead><tr><th className={th}>出错类别</th><th className={th}>次数</th></tr></thead>
          <tbody>
            {s.byError.length === 0 && <tr><td className={td} colSpan={2}>无</td></tr>}
            {s.byError.map((e) => <tr key={e.tag} className="border-t"><td className={td}>{e.tag}</td><td className={td}>{e.count}</td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">用例明细（{list.length}）</h3>
        <button onClick={() => setAll(!all)} className="rounded-full border px-3 py-1 text-xs">{all ? "只看失败" : "显示全部"}</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr><th className={th}>编号</th><th className={th}>分组</th><th className={th}>用户输入</th><th className={th}>结果</th><th className={th}>出错类别</th><th className={th}>详情</th></tr></thead>
          <tbody>
            {list.map((x) => (
              <Fragment key={x.id}>
                <tr className="cursor-pointer border-t hover:bg-muted/50" onClick={() => setOpen(open === x.id ? null : x.id)}>
                  <td className={td}>{x.id}</td><td className={td}>{x.group}</td><td className={td}>{x.input}</td>
                  <td className={td}>{x.pass ? <span className="text-primary">✓ 通过</span> : <span className="text-destructive">✗ 失败</span>}</td>
                  <td className={td}>{x.errors.join("、")}</td>
                  <td className={td}>{x.details.map((d, i) => <div key={i}>{d}</div>)}</td>
                </tr>
                {open === x.id && (
                  <tr><td colSpan={6} className="bg-muted/40 p-2"><pre className="max-h-80 overflow-auto whitespace-pre-wrap text-[11px]">{JSON.stringify(x.raw, null, 2)}</pre></td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </ResultSection>

  );
}

function ImageSummaryCards({ s }: { s: ImageSummary }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Card label="通过数/总数" value={`${s.passed}/${s.cases}`} />
      <Card label="召回率" value={pct(s.recall)} />
      <Card label="准确率" value={pct(s.precision)} />
      <Card label="编造日期率" value={pct(s.fabricatedDateRate)} />
      <Card label="置信度覆盖率" value={pct(s.wrongFlaggedRate)} />
      <Card label="平均耗时" value={ms(s.avgLatencyMs)} />
    </div>
  );
}

function ImageResult({ data }: { data: { scores: ImgScore[]; summary: ImageSummary } }) {
  const [zoom, setZoom] = useState<string | null>(null);
  const s = data.summary;
  return (
    <ResultSection title="图片评测结果" data={data}
      brief={`通过 ${s.passed}/${s.cases} · 编造日期率 ${pct(s.fabricatedDateRate)} · 平均 ${ms(s.avgLatencyMs)}`}>
      <ImageSummaryCards s={s} />
      <ExtraCards e={extras(data.scores)} />

      <div className="space-y-2">
        {data.scores.map((x) => {
          const ops = (x.raw && typeof x.raw === "object" && "ops" in x.raw ? (x.raw as { ops: any[] }).ops : []) ?? [];
          return (
            <div key={x.id} className="flex gap-3 rounded-2xl border bg-background p-3 text-xs">
              <img src={`/eval-images/${x.file}`} alt={x.id} onClick={() => setZoom(x.file)} className="h-20 w-20 shrink-0 cursor-zoom-in rounded-xl object-cover" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium">{x.id} · {x.scene} · {x.pass ? <span className="text-primary">✓ 通过</span> : <span className="text-destructive">✗ 失败</span>}</p>
                {x.errors.length > 0 && <p className="text-destructive">{x.errors.join("、")}</p>}
                {x.details.map((d, i) => <p key={i} className="text-muted-foreground">{d}</p>)}
                <div className="space-y-0.5 pt-1">
                  {ops.length === 0 && <p className="text-muted-foreground">（未识别出物品）</p>}
                  {ops.map((o, i) => (
                    <p key={i}>• {o.name} × {o.quantity ?? "?"}{o.unit ?? ""} · 过期 {o.expiry ?? "—"}{o.low_confidence_fields?.length ? ` · 低置信度：${o.low_confidence_fields.join("/")}` : ""}</p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {zoom && (
        <div onClick={() => setZoom(null)} className="fixed inset-0 z-50 grid place-items-center bg-foreground/80 p-4">
          <img src={`/eval-images/${zoom}`} alt="" className="max-h-full max-w-full rounded-xl" />
        </div>
      )}
    </ResultSection>

  );
}

function accuracyCell(r: RunRow) {
  if (r.kind === "image") return `${r.summary?.passed ?? 0}/${r.summary?.cases ?? 0} · 编造日期 ${pct(r.summary?.fabricatedDateRate)}`;
  return pct(r.summary?.overall?.accuracy);
}

function csvEscape(v: unknown) {
  const s = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function exportCsv(r: RunRow) {
  const scores: any[] = Array.isArray(r.scores) ? r.scores : [];
  const cols = r.kind === "image"
    ? ["id", "file", "scene", "pass", "errors", "details", "expected", "predicted", "matched", "noDateItems", "fabricatedDates", "wrongFields", "wrongFlagged", "latency_ms", "input_tokens", "output_tokens", "cost_usd", "raw"]
    : ["id", "kind", "group", "input", "pass", "errors", "details", "latency_ms", "input_tokens", "output_tokens", "cost_usd", "raw"];
  const lines = [cols.join(",")];
  for (const s of scores) {
    lines.push(cols.map((c) => {
      const v = s[c];
      return csvEscape(Array.isArray(v) && (c === "errors" || c === "details") ? v.join(" | ") : v);
    }).join(","));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `eval-${r.kind}-${r.model.replace(/[^\w.-]/g, "_")}-${r.prompt_version}-${r.created_at.slice(0, 19).replace(/[:T]/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function errCount(r: RunRow, tag: string) {
  return (r.summary?.byError ?? []).find((e: any) => e.tag === tag)?.count ?? 0;
}

function History({ rows, onDeleted }: { rows: RunRow[]; onDeleted: () => void | Promise<void> }) {
  const [sel, setSel] = useState<string[]>([]);
  const remove = async (ids: string[]) => {
    if (!ids.length || !window.confirm(`确定删除 ${ids.length} 条评测记录？删除后无法恢复。`)) return;
    const { error } = await supabase.from("eval_runs").delete().in("id", ids);
    if (error) { window.alert("删除失败：" + error.message); return; }
    setSel((s) => s.filter((x) => !ids.includes(x)));
    await onDeleted();
  };
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const picked = rows.filter((r) => sel.includes(r.id));
  const tags = [...new Set(picked.flatMap((r) => (r.summary?.byError ?? []).map((e: any) => e.tag as string)))];
  const ex = (r: RunRow): Extra => r.summary?.extra ?? extras(Array.isArray(r.scores) ? r.scores : []);
  const acc = (r: RunRow) => (r.kind === "image" ? `${r.summary?.passed ?? 0}/${r.summary?.cases ?? 0}` : pct(r.summary?.overall?.accuracy));
  const metric: Array<[string, (r: RunRow) => string]> = [
    ["类型", (r) => KIND_LABEL[r.kind]],
    ["Prompt", (r) => r.prompt_version],
    ["时间", (r) => new Date(r.created_at).toLocaleString("zh-CN")],
    ["准确率 / 通过数", acc],
    ...(picked.some((r) => r.kind === "image") ? ([["编造日期率", (r: RunRow) => (r.kind === "image" ? pct(r.summary?.fabricatedDateRate) : "—")]] as Array<[string, (r: RunRow) => string]>) : []),
    ["平均耗时", (r) => ms(ex(r).avgLatencyMs)],
    ["P90 耗时", (r) => ms(ex(r).p90LatencyMs)],
    ["平均输入 token", (r) => avgTok(r, "input_tokens")],
    ["平均输出 token", (r) => avgTok(r, "output_tokens")],
    ["每 1000 次调用成本", (r) => usd(ex(r).costPer1kUsd, 3)],
    ["每 1000 次调用额度（估）", (r) => credits1k(r)],
    ...tags.map((t) => [`出错 · ${t}`, (r: RunRow) => String(errCount(r, t))] as [string, (r: RunRow) => string]),
  ];
  return (
    <section className="space-y-3 rounded-3xl border bg-card p-4">
      <h2 className="font-display text-lg font-bold">历史记录</h2>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">勾选多条记录，在下方「模型对比」表中并排查看</p>
        {sel.length > 0 && <button onClick={() => void remove(sel)} className="shrink-0 rounded-full border border-destructive px-2 py-0.5 text-xs text-destructive">删除所选（{sel.length}）</button>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr><th className={th}></th><th className={th}>时间</th><th className={th}>类型</th><th className={th}>模型</th><th className={th}>Prompt</th><th className={th}>准确率</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className={td} colSpan={7}>暂无记录</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className={td}><input type="checkbox" checked={sel.includes(r.id)} onChange={() => toggle(r.id)} /></td>
                <td className={td}>{new Date(r.created_at).toLocaleString("zh-CN")}</td>
                <td className={td}>{KIND_LABEL[r.kind]}</td>
                <td className={td}>{r.model}</td>
                <td className={td}>{r.prompt_version}</td>
                <td className={td}>{accuracyCell(r)}</td>
                <td className={td}><button onClick={() => exportCsv(r)} className="rounded-full border px-2 py-0.5">导出 CSV</button> <button onClick={() => void remove([r.id])} className="rounded-full border border-destructive px-2 py-0.5 text-destructive">删除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {picked.length >= 1 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">模型对比（{picked.length} 条）</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr><th className={th}>指标</th>{picked.map((r) => <th key={r.id} className={th}>{r.model}</th>)}</tr></thead>
              <tbody>
                {metric.map(([label, f]) => (
                  <tr key={label} className="border-t"><td className={td}>{label}</td>{picked.map((r) => <td key={r.id} className={td}>{f(r)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
