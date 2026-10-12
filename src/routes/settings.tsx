import { createFileRoute, Link } from "@tanstack/react-router";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/store";
import { SubHeader } from "@/components/HeaderActions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "设置 · 家底" },
      { name: "description", content: "账号与应用设置。" },
      { property: "og:title", content: "设置 · 家底" },
      { property: "og:description", content: "账号与应用设置。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const session = useSession();
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <SubHeader title="设置" />
      <main className="space-y-3 px-4 pb-10 pt-2">
        <div className="flex items-center gap-3 rounded-3xl border bg-card p-4">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10"><User className="h-5 w-5 text-primary" /></div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">当前账号</p>
            <p className="truncate text-sm font-medium">{session?.user.email ?? "—"}</p>
          </div>
        </div>
        <div className="rounded-3xl border bg-card p-4 text-sm">
          <div className="flex justify-between"><span>版本</span><span className="text-muted-foreground">v1.1</span></div>
        </div>
        <Link to="/eval" className="flex justify-between rounded-3xl border bg-card p-4 text-sm">
          <span>评测（开发者）</span><span className="text-muted-foreground">›</span>
        </Link>
        <button onClick={() => supabase.auth.signOut()} className="flex w-full items-center justify-center gap-2 rounded-full border bg-card py-3 text-sm font-medium text-destructive">
          <LogOut className="h-4 w-4" />退出登录
        </button>
      </main>
    </div>
  );
}
