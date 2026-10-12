import { Link } from "@tanstack/react-router";
import { Bot, Home, Package } from "lucide-react";

const tabs = [
  { to: "/", icon: <Home className="h-5 w-5" />, label: "首页" },
  { to: "/ai", icon: <Bot className="h-5 w-5" />, label: "AI 助手" },
  { to: "/items", icon: <Package className="h-5 w-5" />, label: "物品" },
];

export function BottomNav() {
  return (
    <nav className="flex border-t bg-card pb-[env(safe-area-inset-bottom)]">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          activeProps={{ className: "text-primary" }}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
        >
          {t.icon}
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
