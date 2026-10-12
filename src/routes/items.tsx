import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, Plus, Search, X } from "lucide-react";
import type { Item } from "@/lib/home-ai";
import { addItems, deleteItem, loadItems, updateItem, useItems } from "@/lib/store";
import { HeaderActions } from "@/components/HeaderActions";
import { ItemCard, Field } from "@/components/shared";
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
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-4 pb-3 pt-6 backdrop-blur">
        <h1 className="font-display text-2xl font-bold">家底</h1>
        <HeaderActions />
      </header>

      <main className="flex-1 px-4 pb-40">
        <div className="pt-4">
          <h2 className="font-display text-lg font-semibold">物品</h2>
          <p className="mt-1 text-xs text-muted-foreground">共 {items.length} 件 · 点任意物品可编辑</p>
          <div className="mt-3 flex gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-full border bg-card px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="按名称搜索物品" className="w-full bg-transparent text-sm outline-none" />
              {q && <button aria-label="清空" onClick={() => setQ("")}><X className="h-4 w-4 text-muted-foreground" /></button>}
            </label>
            <button onClick={() => setEdit(blank())} className="flex items-center gap-1 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" />新增</button>
          </div>
        </div>
        {kw && shown.length === 0 ? (
          <p className="pt-10 text-center text-sm text-muted-foreground">没有找到「{q.trim()}」</p>
        ) : items.length === 0 ? (
          <p className="pt-10 text-center text-sm text-muted-foreground">还没有物品，点「新增」手动添加</p>
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

function EditSheet({ item, onClose, onSave, onDelete }: { item: Item; onClose: () => void; onSave: (i: Item) => void; onDelete?: (() => void) | undefined }) {
  const [it, setIt] = useState(item);
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-foreground/30" onClick={onClose}>
      <div className="mx-auto w-full max-w-md rounded-t-3xl bg-background p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="mb-4 font-display text-lg font-semibold">{item.id ? "编辑物品" : "新增物品"}</h3>
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
          {onDelete && <button onClick={onDelete} className="flex items-center gap-1 rounded-full border px-4 py-2.5 text-sm text-destructive"><Trash2 className="h-4 w-4" />删除</button>}
          <button onClick={() => onSave(it)} className="flex-1 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground">保存</button>
        </div>
      </div>
    </div>
  );
}
