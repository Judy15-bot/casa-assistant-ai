import type { ReactNode } from "react";
import { MapPin, Pencil } from "lucide-react";
import { daysLeft, type Item } from "@/lib/home-ai";

export function ExpiryTag({ expiry }: { expiry?: string | undefined }) {
  const n = daysLeft(expiry);
  if (n === undefined) return <span className="text-xs text-muted-foreground">无保质期</span>;
  const urgent = n <= 7;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${urgent ? "bg-warn-soft text-warn" : "bg-secondary text-secondary-foreground"}`}>
      {n < 0 ? "已过期" : n === 0 ? "今天过期" : `${n} 天后过期`}
    </span>
  );
}

export function ItemCard({ item, actions }: { item: Item; actions?: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{item.name} <span className="text-sm text-muted-foreground">×{item.quantity}{item.unit}</span></div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{item.location} · {item.category}</div>
        </div>
        <ExpiryTag expiry={item.expiry} />
      </div>
      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, value, onChange, low, suffix, type = "text", disabled }: { label: string; value: string; onChange: (v: string) => void; low?: boolean; suffix?: string; type?: string; disabled?: boolean }) {
  return (
    <label className={`flex flex-col rounded-xl bg-card px-2.5 py-1.5 ${low ? "low-conf" : ""}`}>
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">{label}{low && <span className="text-warn">· 待确认</span>}<Pencil className="ml-auto h-2.5 w-2.5" /></span>
      <span className="flex items-center">
        <input type={type} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 bg-transparent text-sm font-medium outline-none" />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </span>
    </label>
  );
}
