import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Loader2, Trash2, Plus, Search, X, MapPin, Tags, SearchX, PackagePlus } from "lucide-react";
import type { Item } from "@/lib/home-ai";
import { addItems, deleteItem, loadItems, updateItem, useItems } from "@/lib/store";
import { HeaderActions, Logo } from "@/components/HeaderActions";
import { ItemCard, Field, ListBox } from "@/components/shared";
import { cutoutImage } from "@/lib/cutout";
import { fileToDataUrl, shrink } from "@/lib/image";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/items")({
  head: () => ({
    meta: [
      { title: "物品清单 · 家底" },
      { name: "description", content: "按位置或品类浏览家里的所有物品，随时编辑数量、位置和保质期。" },
      { property: "og:title", content: "物品清单 · 家底" },
      { property: "og:description", content: "按位置或品类浏览家里的所有物品。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ItemsPage,
});

function ItemsPage() {
  const items = useItems();
  const [edit, setEdit] = useState<Item | null>(null);
  const [q, setQ] = useState("");
  const kw = q.trim().toLowerCase();
  const shown = kw ? items.filter((i) => i.name.toLowerCase().includes(kw)) : items;
  const blank = (): Item => ({ id: "", name: "", category: "日用品", quantity: 1, unit: "个", location: "未指定", expiry: undefined, source: "手动", createdAt: "" });
  const remove = async (i: Item) => {
    if (!confirm(`确定删除「${i.name}」吗？`)) return;
    try { await deleteItem(i.id); await loadItems(); setEdit(null); } catch { alert("删除失败，请重试"); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background px-4 pb-3 pt-6 backdrop-blur">
        <Logo />
        <HeaderActions />
      </header>

      <main className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+120px)]">
        <div className="pt-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-ink">物品库</h2>
            <span className="text-xs text-muted-foreground">共 <b className="font-display text-xl text-ink">{items.length}</b> 件物品</span>
          </div>
          <div className="mt-3 flex gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-full border-2 border-border bg-card px-3 py-2.5 transition focus-within:border-ink">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="按名称搜索物品" className="w-full bg-transparent text-sm outline-none" />
              {q && <button aria-label="清空" onClick={() => setQ("")}><X className="h-4 w-4 shrink-0 text-muted-foreground" /></button>}
            </label>
            <button onClick={() => setEdit(blank())} className="flex shrink-0 items-center gap-1 rounded-full bg-ink px-4 text-sm font-bold text-ink-foreground transition active:scale-95"><Plus className="h-4 w-4" />新增</button>
          </div>
        </div>
        {kw && shown.length === 0 ? (
          <div className="pt-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted"><SearchX className="h-5 w-5 text-muted-foreground" /></div>
            <p className="mt-3 text-sm text-muted-foreground">没有找到「{q.trim()}」</p>
            <button onClick={() => setQ("")} className="mt-1 text-sm font-medium text-primary">清空搜索</button>
          </div>
        ) : items.length === 0 ? (
          <div className="pt-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted"><PackagePlus className="h-5 w-5 text-muted-foreground" /></div>
            <p className="mt-3 font-display text-base font-semibold">还没有物品</p>
            <p className="mt-1 text-sm text-muted-foreground">点「新增」手动添加，或去 AI 助手说一句话</p>
          </div>
        ) : (
          <ItemsTab items={shown} onEdit={setEdit} />
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md">
        <BottomNav />
      </div>

      {edit && (
        <EditSheet
          item={edit}
          onClose={() => setEdit(null)}
          onSave={async (it) => {
            if (!it.name.trim()) { alert("请填写名称"); return; }
            try {
              if (it.id) await updateItem(it.id, it);
              else { const { id: _i, createdAt: _c, ...rest } = it; await addItems([{ ...rest, expiry: rest.expiry || undefined }]); }
              await loadItems(); setEdit(null);
            } catch { alert("保存失败，请重试"); }
          }}
          onDelete={edit.id ? () => remove(edit) : undefined}
        />
      )}
    </div>
  );
}

function ItemsTab({ items, onEdit }: { items: Item[]; onEdit: (i: Item) => void }) {
  const [by, setBy] = useState<"location" | "category">("location");
  const groups = items.reduce<Record<string, Item[]>>((g, i) => ((g[i[by]] ??= []).push(i), g), {});
  return (
    <div className="pt-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full border-2 border-ink bg-card p-0.5 text-sm">
          {(["location", "category"] as const).map((k) => (
            <button key={k} onClick={() => setBy(k)} className={`rounded-full px-4 py-1.5 transition ${by === k ? "bg-ink font-bold text-ink-foreground" : "text-muted-foreground"}`}>
              {k === "location" ? "按位置" : "按品类"}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        {Object.entries(groups).map(([g, list]) => (
          <section key={g}>
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-base font-black leading-none text-primary">✻</span>
              {by === "location" ? <MapPin className="h-3.5 w-3.5 text-ink" /> : <Tags className="h-3.5 w-3.5 text-ink" />}
              <h3 className="font-display text-base text-ink">{g}</h3>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">{list.length}</span>
            </div>
            <ListBox>
              {list.map((i) => (
                <button key={i.id} onClick={() => onEdit(i)} className="block w-full text-left transition active:bg-muted"><ItemCard item={i} chevron /></button>
              ))}
            </ListBox>
          </section>
        ))}
      </div>
    </div>
  );
}

function EditSheet({ item, onClose, onSave, onDelete }: { item: Item; onClose: () => void; onSave: (i: Item) => void; onDelete?: (() => void) | undefined }) {
  const [it, setIt] = useState(item);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setNote("正在抠图…");
    try {
      const raw = await shrink(await fileToDataUrl(f), 1280, "image/jpeg");
      const cut = await cutoutImage(raw);
      const image = cut ?? (await shrink(raw, 384));
      setIt((x) => ({ ...x, image }));
      setNote(cut ? "已抠图" : "抠图没成功，先用原图");
    } catch { setNote("图片读取失败"); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-foreground/30" onClick={onClose}>
      <div className="mx-auto w-full max-w-md rounded-t-3xl bg-background p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="mb-3 font-display text-lg text-ink">{item.id ? "编辑物品" : "新增物品"}</h3>
        <label className="mb-4 flex cursor-pointer flex-col items-center gap-1">
          <div className="grid h-32 w-full place-items-center rounded-2xl border-2 border-dashed border-border bg-muted/50">
            {busy ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : it.image ? <img src={it.image} alt={it.name} className="sticker max-h-28 object-contain" /> : <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground"><Camera className="h-6 w-6" />上传物品照片，自动抠图</span>}
          </div>
          <span className="text-[11px] text-muted-foreground">{note || (it.image ? "点图片可更换" : "")}</span>
          <input type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Field label="名称" value={it.name} onChange={(v) => setIt({ ...it, name: v })} />
          <Field label="品类" value={it.category} onChange={(v) => setIt({ ...it, category: v })} />
          <Field label="数量" value={`${it.quantity}`} onChange={(v) => setIt({ ...it, quantity: Number(v) || 0 })} />
          <Field label="单位" value={it.unit} onChange={(v) => setIt({ ...it, unit: v })} />
          <Field label="位置" value={it.location} onChange={(v) => setIt({ ...it, location: v })} />
          <Field label="过期日期" type="date" value={it.expiry ?? ""} onChange={(v) => setIt({ ...it, expiry: v })} />
          {it.id && <div className="flex flex-col justify-center rounded-xl bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">来源：{it.source}<br />录入：{it.createdAt}</div>}
        </div>
        <div className="mt-5 flex gap-2">
          {onDelete && <button onClick={onDelete} className="flex items-center gap-1 rounded-full border-2 border-ink bg-muted px-4 py-2.5 text-sm font-bold text-ink"><Trash2 className="h-4 w-4" />删除</button>}
          <button onClick={() => onSave(it)} disabled={busy} className="flex-1 rounded-full border-2 border-ink bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  );
}
