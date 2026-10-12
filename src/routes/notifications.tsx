import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { NOTICES } from "@/lib/notices";
import { SubHeader } from "@/components/HeaderActions";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "消息提醒 · 家底" },
      { name: "description", content: "家底的版本更新与系统通知。" },
      { property: "og:title", content: "消息提醒 · 家底" },
      { property: "og:description", content: "家底的版本更新与系统通知。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <SubHeader title="消息提醒" />
      <main className="space-y-3 px-4 pb-10 pt-2">
        {NOTICES.map((n) => (
          <article key={n.id} className="rounded-3xl border bg-card p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><Megaphone className="h-4 w-4 text-primary" />{n.title}</div>
            <p className="text-sm text-muted-foreground">{n.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">{n.date}</p>
          </article>
        ))}
      </main>
    </div>
  );
}
