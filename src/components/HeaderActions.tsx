import { Link } from "@tanstack/react-router";
import { Bell, Settings } from "lucide-react";
import { NOTICES } from "@/lib/notices";

export function HeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <Link to="/notifications" aria-label="消息提醒" className="relative grid h-9 w-9 place-items-center rounded-full bg-muted text-foreground active:scale-95">
        <Bell className="h-4 w-4" />
        {NOTICES.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warn" />}
      </Link>
      <Link to="/settings" aria-label="设置" className="grid h-9 w-9 place-items-center rounded-full bg-muted text-foreground active:scale-95">
        <Settings className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function SubHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-5 pb-3 pt-6 backdrop-blur">
      <button onClick={() => history.back()} aria-label="返回" className="grid h-9 w-9 place-items-center rounded-full bg-muted">‹</button>
      <h1 className="font-display text-xl font-bold">{title}</h1>
    </header>
  );
}
