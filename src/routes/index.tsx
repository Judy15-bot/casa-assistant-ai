import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, Home, ImageIcon, Mic, Package, Pencil, Send, Sparkles, Trash2, X, MapPin, CalendarClock } from "lucide-react";
import { daysLeft, parse, PHOTO_DEMO, seedItems, SHOT_DEMO, type Item, type Op, type Reply } from "@/lib/home-ai";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "家底 · 家庭物品 AI 助手" },
      { name: "description", content: "一句话、一张照片就能入库，随时问家里还有没有、放在哪、什么快过期。" },
      { property: "og:title", content: "家底 · 家庭物品 AI 助手" },
      { property: "og:description", content: "不用你记的家庭物品管理助手。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

type Msg = { id: number; role: "user" | "ai"; text?: string; reply?: Reply; done?: "ok" | "cancel" };
let mid = 0;

function App() {
  const [items, setItems] = useState<Item[]>(seedItems);
  const [tab, setTab] = useState<"home" | "items">("home");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [edit, setEdit] = useState<Item | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, thinking]);

  const send = (text: string, preset?: Reply, source: Item["source"] = "文字") => {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { id: ++mid, role: "user", text }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMsgs((m) => [...m, { id: ++mid, role: "ai", reply: preset ?? parse(text, items, source) }]);
    }, 650);
  };

  const apply = (msgId: number, ops: Op[]) => {
    setItems((prev) => {
      let next = [...prev];
      for (const op of ops) {
        if (op.kind === "add") next.unshift({ ...op.item, id: crypto.randomUUID(), createdAt: new Date().toISOString().slice(0, 10) });
        else if (op.kind === "update" && op.targetId) next = next.map((i) => (i.id === op.targetId ? { ...i, ...op.patch } : i));
        else if (op.kind === "used_up" && op.targetId) next = next.filter((i) => i.id !== op.targetId);
      }
      return next;
    });
    setMsgs((m) => m.map((x) => (x.id === msgId ? { ...x, done: "ok" } : x)));
  };

  const quickOp = (op: Op) => {
    setMsgs((m) => [...m, { id: ++mid, role: "ai", reply: { type: "confirm", ops: [op] } }]);
  };

  const expiring = items.filter((i) => (daysLeft(i.expiry) ?? 999) <= 30).sort((a, b) => (a.expiry! > b.expiry! ? 1 : -1));
  const chatting = msgs.length > 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/90 px-5 pb-3 pt-6 backdrop-blur">
        <div>
          <h1 className="font-display text-2xl font-bold">家底</h1>
          <p className="text-xs text-muted-foreground">共 {items.length} 件物品 · 不用你记</p>
        </div>
        {chatting && (
          <button onClick={() => setMsgs([])} className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            结束对话
          </button>
        )}
      </header>

      <main className="flex-1 px-4 pb-48">
        {chatting ? (
          <div className="space-y-4 pt-2">
            {msgs.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.text}</div>
                </div>
              ) : (
                <AiBubble key={m.id} msg={m} onApply={(ops) => apply(m.id, ops)} onCancel={() => setMsgs((all) => all.map((x) => (x.id === m.id ? { ...x, done: "cancel" } : x)))} onQuick={quickOp} />
              ),
            )}
            {thinking && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" /> 正在理解…
              </div>
            )}
            <div ref={end} />
          </div>
        ) : tab === "home" ? (
          <HomeTab expiring={expiring} items={items} onAsk={(t) => send(t)} />
        ) : (
          <ItemsTab items={items} onEdit={setEdit} />
        )}
      </main>

      {/* AI input */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md">
        <div className="mx-3 mb-2 rounded-3xl border bg-card p-2 shadow-soft">
          {recording ? (
            <button
              onClick={() => { setRecording(false); send("刚买了两瓶酱油放厨房上柜，明年三月过期", undefined, "语音"); }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-warn-soft py-3 text-sm font-medium text-warn"
            >
              <span className="h-2.5 w-2.5 animate-ping rounded-full bg-warn" /> 正在聆听… 点击结束
            </button>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="说一句：买了三包纸巾放卫生间…"
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              {input ? (
                <button type="submit" aria-label="发送" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"><Send className="h-4 w-4" /></button>
              ) : (
                <button type="button" aria-label="语音" onClick={() => setRecording(true)} className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"><Mic className="h-4 w-4" /></button>
              )}
            </form>
          )}
          <div className="mt-1 flex gap-2 px-1">
            <Chip icon={<Camera className="h-3.5 w-3.5" />} label="拍照识别" onClick={() => send("[照片] 冰箱一层", PHOTO_DEMO)} />
            <Chip icon={<ImageIcon className="h-3.5 w-3.5" />} label="订单截图" onClick={() => send("[截图] 淘宝订单", SHOT_DEMO)} />
          </div>
        </div>
        {!chatting && (
          <nav className="flex border-t bg-card pb-[env(safe-area-inset-bottom)]">
            <TabBtn active={tab === "home"} onClick={() => setTab("home")} icon={<Home className="h-5 w-5" />} label="首页" />
            <TabBtn active={tab === "items"} onClick={() => setTab("items")} icon={<Package className="h-5 w-5" />} label="物品" />
          </nav>
        )}
      </div>

      {edit && (
        <EditSheet
          item={edit}
          onClose={() => setEdit(null)}
          onSave={(it) => { setItems((p) => p.map((i) => (i.id === it.id ? it : i))); setEdit(null); }}
          onDelete={() => { setItems((p) => p.filter((i) => i.id !== edit.id)); setEdit(null); }}
        />
      )}
    </div>
  );
}

function Chip({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground active:scale-95">
      {icon}{label}
    </button>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-primary" : "text-muted-foreground"}`}>
      {icon}{label}
    </button>
  );
}

function ExpiryTag({ expiry }: { expiry?: string | undefined }) {
  const n = daysLeft(expiry);
  if (n === undefined) return <span className="text-xs text-muted-foreground">无保质期</span>;
  const urgent = n <= 7;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${urgent ? "bg-warn-soft text-warn" : "bg-secondary text-secondary-foreground"}`}>
      {n < 0 ? "已过期" : n === 0 ? "今天过期" : `${n} 天后过期`}
    </span>
  );
}

function ItemCard({ item, actions }: { item: Item; actions?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{item.name} <span className="text-sm text-muted-foreground">×{item.quantity}{item.unit}</span></div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{item.location} · {item.category}</div>
        </div>
        <ExpiryTag expiry={item.expiry} />
      </div>
      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </div>
  );
}

function HomeTab({ expiring, items, onAsk }: { expiring: Item[]; items: Item[]; onAsk: (t: string) => void }) {
  return (
    <div className="space-y-6 pt-2">
      <section className="rounded-3xl bg-primary p-5 text-primary-foreground">
        <div className="flex items-center gap-2 text-sm opacity-80"><CalendarClock className="h-4 w-4" />本周提醒</div>
        <p className="mt-2 font-display text-xl leading-snug">
          有 <span className="text-3xl font-bold text-accent">{expiring.filter((i) => (daysLeft(i.expiry) ?? 99) <= 7).length}</span> 件物品 7 天内过期
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">即将过期</h2>
        <div className="space-y-2">
          {expiring.length ? expiring.map((i) => <ItemCard key={i.id} item={i} />) : <p className="text-sm text-muted-foreground">暂无</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-semibold">试试这样问</h2>
        <div className="flex flex-wrap gap-2">
          {["电池放哪了", "家里还有酱油吗", "我想买洗洁精", "什么快过期了", "防晒我放到浴室了", "牛奶用完了，买了三包纸巾放卫生间柜子"].map((q) => (
            <button key={q} onClick={() => onAsk(q)} className="rounded-full border bg-card px-3 py-2 text-sm active:bg-muted">{q}</button>
          ))}
        </div>
      </section>
      <p className="text-center text-xs text-muted-foreground">已记录 {items.length} 件 · 所有写入操作都会先让你确认</p>
    </div>
  );
}

function ItemsTab({ items, onEdit }: { items: Item[]; onEdit: (i: Item) => void }) {
  const [by, setBy] = useState<"location" | "category">("location");
  const groups = items.reduce<Record<string, Item[]>>((g, i) => ((g[i[by]] ??= []).push(i), g), {});
  return (
    <div className="pt-2">
      <div className="mb-4 inline-flex rounded-full bg-muted p-1 text-sm">
        {(["location", "category"] as const).map((k) => (
          <button key={k} onClick={() => setBy(k)} className={`rounded-full px-4 py-1.5 ${by === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>
            {k === "location" ? "按位置" : "按品类"}
          </button>
        ))}
      </div>
      <div className="space-y-5">
        {Object.entries(groups).map(([g, list]) => (
          <section key={g}>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{g} · {list.length}</h3>
            <div className="space-y-2">
              {list.map((i) => (
                <button key={i.id} onClick={() => onEdit(i)} className="block w-full text-left"><ItemCard item={i} /></button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function AiBubble({ msg, onApply, onCancel, onQuick }: { msg: Msg; onApply: (ops: Op[]) => void; onCancel: () => void; onQuick: (op: Op) => void }) {
  const r = msg.reply!;
  if (r.type === "text") return <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-card px-4 py-2.5 text-sm">{r.text}</div>;
  if (r.type === "results")
    return (
      <div className="space-y-2">
        <div className="text-sm">{r.text}</div>
        {r.items.map((i) => (
          <ItemCard
            key={i.id}
            item={i}
            actions={
              <>
                <SmallBtn onClick={() => onQuick({ kind: "used_up", targetId: i.id, candidates: [i], label: i.name })}>已用完</SmallBtn>
                <SmallBtn onClick={() => onQuick({ kind: "update", targetId: i.id, candidates: [i], patch: { quantity: Math.max(0, i.quantity - 1) }, label: i.name })}>用掉 1{i.unit}</SmallBtn>
              </>
            }
          />
        ))}
      </div>
    );
  return <ConfirmCard ops={r.ops} done={msg.done} onApply={onApply} onCancel={onCancel} />;
}

function SmallBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-full bg-muted px-3 py-1 text-xs active:scale-95">{children}</button>;
}

function ConfirmCard({ ops: initial, done, onApply, onCancel }: { ops: Op[]; done?: "ok" | "cancel" | undefined; onApply: (ops: Op[]) => void; onCancel: () => void }) {
  const [ops, setOps] = useState<(Op & { off?: boolean })[]>(initial);
  const set = (i: number, o: Op & { off?: boolean }) => setOps((p) => p.map((x, k) => (k === i ? o : x)));
  const active = ops.filter((o) => !o.off);
  const ready = active.every((o) => o.kind === "add" || o.targetId);

  return (
    <div className={`rounded-3xl border-2 bg-card p-4 ${done ? "opacity-60" : "border-primary/30"}`}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" />请确认 {ops.length} 项操作</div>
      <div className="space-y-3">
        {ops.map((op, i) => (
          <div key={i} className={`rounded-2xl bg-muted/60 p-3 ${op.off ? "line-through opacity-40" : ""}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${op.kind === "add" ? "bg-secondary text-secondary-foreground" : op.kind === "used_up" ? "bg-warn-soft text-warn" : "bg-accent text-accent-foreground"}`}>
                {op.kind === "add" ? "新增" : op.kind === "used_up" ? "标记用完" : "更新"}
              </span>
              {!done && ops.length > 1 && (
                <button onClick={() => set(i, { ...op, off: !op.off })} className="text-xs text-muted-foreground">{op.off ? "恢复" : "取消此条"}</button>
              )}
            </div>
            {op.kind === "add" ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Field label="名称" value={op.item.name} onChange={(v) => set(i, { ...op, item: { ...op.item, name: v } })} disabled={!!done} />
                <Field label="数量" value={`${op.item.quantity}`} low={op.lowConf.includes("quantity")} onChange={(v) => set(i, { ...op, item: { ...op.item, quantity: Number(v) || 1 } })} suffix={op.item.unit} disabled={!!done} />
                <Field label="位置" value={op.item.location} low={op.lowConf.includes("location")} onChange={(v) => set(i, { ...op, lowConf: op.lowConf.filter((f) => f !== "location"), item: { ...op.item, location: v } })} disabled={!!done} />
                <Field label="过期" type="date" value={op.item.expiry ?? ""} low={op.lowConf.includes("expiry")} onChange={(v) => set(i, { ...op, item: { ...op.item, expiry: v } })} disabled={!!done} />
              </div>
            ) : (
              <div className="text-sm">
                <div className="font-medium">
                  {op.label}
                  {op.kind === "update" && " → " + Object.entries(op.patch).map(([k, v]) => (k === "location" ? `位置：${v}` : `数量：${v}`)).join("，")}
                </div>
                {op.candidates.length === 0 && <p className="mt-1 text-xs text-destructive">没找到这件物品</p>}
                {op.candidates.length > 1 && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-xs text-warn">找到 {op.candidates.length} 件，是哪一件？</p>
                    {op.candidates.map((c) => (
                      <button key={c.id} disabled={!!done} onClick={() => set(i, { ...op, targetId: c.id })}
                        className={`block w-full rounded-xl border px-3 py-2 text-left text-xs ${op.targetId === c.id ? "border-primary bg-secondary" : "bg-card"}`}>
                        {c.name} · {c.location} · {c.expiry ?? "无保质期"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {done ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">{done === "ok" ? "✓ 已保存" : "已取消，可以直接补充一句，如「不对，是三瓶」"}</p>
      ) : (
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="flex flex-1 items-center justify-center gap-1 rounded-full border py-2.5 text-sm"><X className="h-4 w-4" />取消</button>
          <button disabled={!ready || !active.length} onClick={() => onApply(active)} className="flex flex-[2] items-center justify-center gap-1 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40">
            <Check className="h-4 w-4" />{ops.length > 1 ? "全部确认" : "确认"}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, low, suffix, type = "text", disabled }: { label: string; value: string; onChange: (v: string) => void; low?: boolean; suffix?: string; type?: string; disabled?: boolean }) {
  return (
    <label className={`flex flex-col rounded-xl bg-card px-2.5 py-1.5 ${low ? "low-conf" : ""}`}>
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">{label}{low && <span className="text-warn">· 待确认</span>}<Pencil className="ml-auto h-2.5 w-2.5" /></span>
      <span className="flex items-center">
        <input type={type} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 bg-transparent text-sm font-medium outline-none" />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </span>
    </label>
  );
}

function EditSheet({ item, onClose, onSave, onDelete }: { item: Item; onClose: () => void; onSave: (i: Item) => void; onDelete: () => void }) {
  const [it, setIt] = useState(item);
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-foreground/30" onClick={onClose}>
      <div className="mx-auto w-full max-w-md rounded-t-3xl bg-background p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="mb-4 font-display text-lg font-semibold">编辑物品</h3>
        <div className="grid grid-cols-2 gap-2">
          <Field label="名称" value={it.name} onChange={(v) => setIt({ ...it, name: v })} />
          <Field label="品类" value={it.category} onChange={(v) => setIt({ ...it, category: v })} />
          <Field label="数量" value={`${it.quantity}`} suffix={it.unit} onChange={(v) => setIt({ ...it, quantity: Number(v) || 0 })} />
          <Field label="位置" value={it.location} onChange={(v) => setIt({ ...it, location: v })} />
          <Field label="过期日期" type="date" value={it.expiry ?? ""} onChange={(v) => setIt({ ...it, expiry: v })} />
          <div className="flex flex-col justify-center rounded-xl bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">来源：{it.source}<br />录入：{it.createdAt}</div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onDelete} className="flex items-center gap-1 rounded-full border px-4 py-2.5 text-sm text-destructive"><Trash2 className="h-4 w-4" />删除</button>
          <button onClick={() => onSave(it)} className="flex-1 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground">保存</button>
        </div>
      </div>
    </div>
  );
}
