import { Link } from "@tanstack/react-router";
import { Home, Archive } from "lucide-react";

export function BottomNav() {
  return (
    <div className="bg-gradient-to-t from-background via-background to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-4">
      <nav className="flex items-center justify-around rounded-full border-2 border-ink bg-card py-2 shadow-soft">
        <Link to="/" aria-label="首页" activeOptions={{ exact: true }} activeProps={{ className: "text-ink" }} inactiveProps={{ className: "text-muted-foreground" }} className="grid h-10 w-14 place-items-center">
          <Home className="h-6 w-6" strokeWidth={2.4} />
        </Link>
        <Link to="/ai" search={{}} aria-label="AI 助手" className="relative grid h-11 w-16 place-items-center rounded-full bg-ink text-ink-foreground active:scale-95">
          <span className="absolute -top-1.5 left-2 h-3 w-3 rotate-45 rounded-sm bg-ink" />
          <span className="absolute -top-1.5 right-2 h-3 w-3 rotate-45 rounded-sm bg-ink" />
          <span className="relative font-display text-lg leading-none">AI</span>
        </Link>
        <Link to="/items" aria-label="物品" activeProps={{ className: "text-ink" }} inactiveProps={{ className: "text-muted-foreground" }} className="grid h-10 w-14 place-items-center">
          <Archive className="h-6 w-6" strokeWidth={2.4} />
        </Link>
      </nav>
    </div>
  );
}
