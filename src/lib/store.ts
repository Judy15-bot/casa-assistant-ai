import { useEffect, useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Item } from "./home-ai";

let items: Item[] = [];
let session: Session | null | undefined = undefined; // undefined = loading
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

type Row = {
  id: string; name: string; category: string; quantity: number; unit: string;
  location: string; expiry: string | null; source: string; created_at: string;
};
const toItem = (r: Row): Item => ({
  id: r.id, name: r.name, category: r.category, quantity: Number(r.quantity), unit: r.unit,
  location: r.location, expiry: r.expiry ?? undefined, source: r.source as Item["source"],
  createdAt: r.created_at.slice(0, 10),
});
const toRow = (i: Partial<Item>) => {
  const r: Record<string, unknown> = {};
  for (const k of ["name", "category", "quantity", "unit", "location", "source"] as const) if (i[k] !== undefined) r[k] = i[k];
  if ("expiry" in i) r["expiry"] = i.expiry || null;
  return r;
};

export async function loadItems() {
  const { data, error } = await supabase.from("items").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  items = (data as Row[]).map(toItem);
  emit();
}

export async function addItems(list: Omit<Item, "id" | "createdAt">[]) {
  if (!list.length) return;
  const { error } = await supabase.from("items").insert(list.map(toRow) as never);
  if (error) throw error;
}
export async function updateItem(id: string, patch: Partial<Item>) {
  const { error } = await supabase.from("items").update(toRow(patch) as never).eq("id", id);
  if (error) throw error;
}
export async function deleteItem(id: string) {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
}

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  supabase.auth.onAuthStateChange((_e, s) => {
    const changed = s?.user.id !== session?.user.id;
    session = s;
    if (!s) items = [];
    emit();
    if (s && changed) loadItems().catch(console.error);
  });
  supabase.auth.getSession().then(({ data }) => {
    if (session === undefined) {
      session = data.session;
      emit();
      if (data.session) loadItems().catch(console.error);
    }
  });
}

export function useSession() {
  useEffect(() => {
    start();
  }, []);
  return useSyncExternalStore(subscribe, () => session, () => undefined);
}
export function useItems() {
  return useSyncExternalStore(subscribe, () => items, () => items);
}
