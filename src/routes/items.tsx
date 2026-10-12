import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Item } from "@/lib/home-ai";
import { deleteItem, loadItems, updateItem, useItems } from "@/lib/store";
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

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background/90 px-5 pb-3 pt-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">物品</h1>
          <HeaderActions />
        </div>
        <p className="text-xs text-muted-foreground">共 {items.length} 件 · 点任意物品可编辑</p>
      </header>

      <main className="flex-1 px-4 pb-40">
        <ItemsTab items={items} onEdit={setEdit} />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md">
        <BottomNav />
      </div>

      {edit && (
        <EditSheet
          item={edit}
          onClose={() => setEdit(null)}
          onSave={async (it) => { try { await updateItem(it.id, it); await loadItems(); setEdit(null); } catch { alert("保存失败，请重试"); } }}
          onDelete={async () => { try { await deleteItem(edit.id); await loadItems(); setEdit(null); } catch { alert("删除失败，请重试"); } }}
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
