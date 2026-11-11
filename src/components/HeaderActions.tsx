import { Link } from "@tanstack/react-router";
import { Bell, Settings } from "lucide-react";
import { NOTICES } from "@/lib/notices";

export function HeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <Link to="/notifications" aria-label="消息提醒" className="relative grid h-9 w-9 place-items-center rounded-full bg-ink text-ink-foreground active:scale-95">
        <Bell className="h-4 w-4" />
        {NOTICES.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />}
      </Link>
      <Link to="/settings" aria-label="设置" className="grid h-9 w-9 place-items-center rounded-full bg-ink text-ink-foreground active:scale-95">
        <Settings className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function Logo() {
  return (
    <div className="leading-none">
      <h1 className="font-display text-[26px] tracking-tight text-ink" style={{ WebkitTextStroke: "0.5px currentColor" }}>家底<span className="text-primary">.</span></h1>
      <p className="mt-1 text-[11px] text-muted-foreground">家里的东西，替你记着</p>
    </div>
  );
}

export function SubHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-5 pb-3 pt-6 backdrop-blur">
      <button onClick={() => history.back()} aria-label="返回" className="grid h-9 w-9 place-items-center rounded-full bg-ink text-lg text-ink-foreground">‹</button>
      <h1 className="font-display text-xl font-bold">{title}</h1>
    </header>
  );
}
