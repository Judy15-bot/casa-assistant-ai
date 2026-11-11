import type { ReactNode } from "react";
import { ChevronRight, MapPin, Package, Pencil } from "lucide-react";
import { daysLeft, type Item } from "@/lib/home-ai";

const TAG: Record<string, string> = {
  食品: "bg-tag-food text-ink-foreground",
  调味品: "bg-tag-food text-ink-foreground",
  护肤品: "bg-tag-skin text-ink-foreground",
  药品: "bg-tag-med text-ink-foreground",
  日用品: "bg-tag-home text-tag-home-foreground",
};

export function CategoryTag({ category }: { category: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border-2 border-ink px-2 py-px text-[11px] font-bold leading-4 ${TAG[category] ?? "bg-ink text-ink-foreground"}`}>
      {category}
    </span>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5">
      <span className="text-lg font-black leading-none text-primary">✻</span>
      <h2 className="font-display text-lg text-ink">{children}</h2>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

export function ItemThumb({ item, size = 56 }: { item: Item; size?: number }) {
  return (
    <div className="grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {item.image ? (
        <img src={item.image} alt={item.name} style={{ width: size, height: size }} className="sticker object-contain" />
      ) : (
        <div className="grid h-full w-full place-items-center rounded-2xl bg-muted"><Package className="h-5 w-5 text-muted-foreground" /></div>
      )}
    </div>
  );
}

export function ExpiryTag({ expiry }: { expiry?: string | undefined }) {
  const n = daysLeft(expiry);
  if (n === undefined) return <span className="text-[11px] text-muted-foreground">无保质期</span>;
  const urgent = n <= 7;
  return (
    <span className={`text-[11px] font-bold ${urgent ? "text-primary" : "text-muted-foreground"}`}>
      {n < 0 ? "已过期" : n === 0 ? "今天过期" : `${n} 天后过期`}
    </span>
  );
}

/** 列表中的一行：抠图缩略图 + 名称 + 品类标签 + 位置 */
export function ItemCard({ item, actions, chevron }: { item: Item; actions?: ReactNode; chevron?: boolean }) {
  return (
    <div className="px-3.5 py-3">
      <div className="flex items-center gap-3">
        <ItemThumb item={item} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold text-ink">{item.name} <span className="text-xs font-normal text-muted-foreground">×{item.quantity}{item.unit}</span></div>
          <div className="mt-1"><ExpiryTag expiry={item.expiry} /></div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <CategoryTag category={item.category} />
          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" />{item.location}</span>
        </div>
        {chevron && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>
      {actions && <div className="mt-3 flex gap-2">{actions}</div>}
    </div>
  );
}

/** 白色圆角容器，行之间用虚线隔开 */
export function ListBox({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft [&>*:not(:last-child)]:dash-sep">{children}</div>;
}

export function Field({ label, value, onChange, low, suffix, type = "text", disabled }: { label: string; value: string; onChange: (v: string) => void; low?: boolean; suffix?: string; type?: string; disabled?: boolean }) {
  return (
    <label className={`flex flex-col rounded-xl border border-border bg-card px-2.5 py-1.5 ${low ? "low-conf" : ""}`}>
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">{label}{low && <span className="text-warn">· 待确认</span>}<Pencil className="ml-auto h-2.5 w-2.5" /></span>
      <span className="flex items-center">
        <input type={type} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 bg-transparent text-sm font-medium outline-none" />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </span>
    </label>
  );
}
