import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { daysLeft } from "@/lib/home-ai";
import { useItems } from "@/lib/store";
import { ItemCard, ListBox, SectionTitle } from "@/components/shared";
import { HeaderActions, Logo } from "@/components/HeaderActions";
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
  const recent = items.slice(0, 5);
  const count = (max: number) => items.filter((i) => { const d = daysLeft(i.expiry); return d !== undefined && d >= 0 && d <= max; }).length;
  const stats = [
    { label: "家庭物品", n: items.length },
    { label: "30天内", n: count(30) },
    { label: "7天内", n: count(7), hot: true },
    { label: "已过期", n: items.filter((i) => (daysLeft(i.expiry) ?? 0) < 0).length, hot: true },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/90 px-4 pb-3 pt-6 backdrop-blur">
        <Logo />
        <HeaderActions />
      </header>

      <main className="flex-1 px-4 pb-32">
        <div className="space-y-6 pt-3">
          <section className="rounded-3xl border-2 border-ink bg-ink p-3 shadow-soft">
            <div className="mb-2.5 flex items-center gap-1.5 px-1 text-xs font-medium text-ink-foreground/70"><CalendarClock className="h-3.5 w-3.5" />家底概览</div>
            <div className="grid grid-cols-4 gap-2">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col items-center rounded-2xl bg-card px-1 py-3">
                  <span className={`font-display text-2xl leading-none ${s.hot ? "text-primary" : "text-ink"}`}>{s.n}</span>
                  <span className="mt-1.5 text-[11px] font-bold text-ink">{s.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>即将到期</SectionTitle>
            {expiring.length ? (
              <ListBox>{expiring.map((i) => <Link key={i.id} to="/items" className="block"><ItemCard item={i} chevron /></Link>)}</ListBox>
            ) : (
              <div className="rounded-2xl border bg-card py-5 text-center text-sm text-muted-foreground shadow-soft">暂无临期物品</div>
            )}
          </section>

          <section>
            <SectionTitle>近期新增</SectionTitle>
            {recent.length ? (
              <ListBox>{recent.map((i) => <Link key={i.id} to="/items" className="block"><ItemCard item={i} chevron /></Link>)}</ListBox>
            ) : (
              <div className="rounded-2xl border bg-card py-5 text-center text-sm text-muted-foreground shadow-soft">还没有物品</div>
            )}
          </section>

          <section>
            <SectionTitle>试试这样问</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((q) => (
                <button key={q} onClick={() => navigate({ to: "/ai", search: { q } })} className="rounded-full border-2 border-ink bg-card px-3 py-1.5 text-sm font-medium active:bg-muted">
                  {q}
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md">
        <BottomNav />
      </div>
    </div>
  );
}
