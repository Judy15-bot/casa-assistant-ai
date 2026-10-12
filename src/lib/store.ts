import { useSyncExternalStore } from "react";
import { seedItems, type Item } from "./home-ai";

let items: Item[] = seedItems;
const listeners = new Set<() => void>();

export const getItems = () => items;

export function setItems(update: (prev: Item[]) => Item[]) {
  items = update(items);
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useItems() {
  return useSyncExternalStore(subscribe, getItems, getItems);
}
