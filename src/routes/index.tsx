import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { daysLeft } from "@/lib/home-ai";
import { useItems } from "@/lib/store";
import { ItemCard } from "@/components/shared";
import { HeaderActions } from "@/components/HeaderActions";
import { BottomNav } from "@/components/BottomNav";

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
  component: HomePage,
});

const SUGGESTIONS = [
  "电池放哪了",
  "家里还有酱油吗",
  "我想买洗洁精",
  "什么快过期了",
  "防晒我放到浴室了",
  "牛奶用完了，买了三包纸巾放卫生间柜子",
];

function HomePage() {
  const items = useItems();
  const navigate = useNavigate();
  const expiring = items
    .filter((i) => (daysLeft(i.expiry) ?? 999) <= 30)
    .sort((a, b) => (a.expiry! > b.expiry! ? 1 : -1));

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/90 px-5 pb-3 pt-6 backdrop-blur">
        <h1 className="font-display text-2xl font-bold">家底</h1>
        <HeaderActions />
      </header>

      <main className="flex-1 px-4 pb-40">
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
              {SUGGESTIONS.map((q) => (
                <button key={q} onClick={() => navigate({ to: "/ai", search: { q } })} className="rounded-full border bg-card px-3 py-2 text-sm active:bg-muted">
                  {q}
                </button>
              ))}
            </div>
          </section>

          <p className="text-center text-xs text-muted-foreground">已记录 {items.length} 件 · 所有写入操作都会先让你确认</p>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md">
        <BottomNav />
      </div>
    </div>
  );
}
