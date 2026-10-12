// @ts-nocheck

export type Item = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  expiry?: string | undefined; // YYYY-MM-DD
  source: "文字" | "语音" | "拍照" | "截图" | "手动";
  createdAt: string;
};

export type Op =
  | { kind: "add"; item: Omit<Item, "id" | "createdAt">; lowConf: string[] }
  | { kind: "update"; targetId?: string | undefined; candidates: Item[]; patch: Partial<Item>; label: string }
  | { kind: "used_up"; targetId?: string | undefined; candidates: Item[]; label: string };

export type Reply =
  | { type: "confirm"; ops: Op[] }
  | { type: "results"; text: string; items: Item[] }
  | { type: "text"; text: string };

const today = new Date();
const d = (days: number) => {
  const t = new Date(today);
  t.setDate(t.getDate() + days);
  return t.toISOString().slice(0, 10);
};

export const seedItems: Item[] = [
  { id: "1", name: "酱油", category: "调味品", quantity: 1, unit: "瓶", location: "厨房上柜", expiry: d(160), source: "文字", createdAt: d(-20) },
  { id: "2", name: "牛奶", category: "食品", quantity: 2, unit: "盒", location: "冰箱", expiry: d(3), source: "截图", createdAt: d(-4) },
  { id: "3", name: "防晒霜", category: "护肤品", quantity: 1, unit: "支", location: "卧室抽屉", expiry: d(40), source: "拍照", createdAt: d(-60) },
  { id: "4", name: "防晒霜", category: "护肤品", quantity: 1, unit: "支", location: "背包", expiry: d(220), source: "文字", createdAt: d(-10) },
  { id: "5", name: "5号电池", category: "日用品", quantity: 8, unit: "节", location: "电视柜抽屉", source: "语音", createdAt: d(-90) },
  { id: "6", name: "纸巾", category: "日用品", quantity: 3, unit: "包", location: "卫生间柜子", source: "文字", createdAt: d(-2) },
  { id: "7", name: "布洛芬", category: "药品", quantity: 1, unit: "盒", location: "药箱", expiry: d(6), source: "拍照", createdAt: d(-120) },
  { id: "8", name: "洗洁精", category: "日用品", quantity: 2, unit: "瓶", location: "水槽下", expiry: d(400), source: "截图", createdAt: d(-15) },
];

export const daysLeft = (expiry?: string) =>
  expiry ? Math.ceil((new Date(expiry).getTime() - today.getTime()) / 86400000) : undefined;

const NUM: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const UNITS = "瓶|包|盒|支|节|袋|个|罐|卷|桶|件";
const LOCS = ["厨房上柜", "厨房", "冰箱", "卫生间柜子", "卫生间", "浴室", "卧室抽屉", "卧室", "客厅", "药箱", "电视柜抽屉", "阳台", "水槽下", "背包"];
const CATS: [RegExp, string][] = [
  [/酱油|醋|盐|糖|油/, "调味品"],
  [/奶|面|米|零食|饼干|水果|鸡蛋/, "食品"],
  [/药|布洛芬|感冒/, "药品"],
  [/霜|乳|面膜|精华|洗面奶/, "护肤品"],
];

const findItems = (items: Item[], q: string) =>
  items.filter((i) => q.includes(i.name) || i.name.includes(q) || (q.length >= 2 && i.name.includes(q.slice(0, 2))));

function guessName(s: string) {
  const m = s.match(new RegExp(`(?:[0-9]+|[一两二三四五六七八九十])(?:${UNITS})([\\u4e00-\\u9fa5A-Za-z0-9]{1,6}?)(?=[，,。放在]|$)`));
  return m?.[1];
}

// Simulated AI intent + field extraction (V1 prototype; real model via function calling later)
export function parse(input: string, items: Item[], source: Item["source"] = "文字"): Reply {
  const s = input.trim();
  if (!s) return { type: "text", text: "说点什么吧～" };

  if (/想买|要不要买|该买/.test(s)) {
    const q = s.replace(/.*(想买|要不要买|该买)/, "").replace(/[吗呢？?。]/g, "");
    const hits = findItems(items, q);
    return hits.length
      ? { type: "results", text: `先别急，家里已经有 ${hits.length} 件「${q}」：`, items: hits }
      : { type: "text", text: `家里没有记录「${q}」，可以放心买。` };
  }

  if (/快过期|过期/.test(s) && /什么|哪些|吗/.test(s)) {
    const hits = items.filter((i) => (daysLeft(i.expiry) ?? 999) <= 30).sort((a, b) => (a.expiry! > b.expiry! ? 1 : -1));
    return hits.length ? { type: "results", text: `30 天内有 ${hits.length} 件快过期：`, items: hits } : { type: "text", text: "最近没有快过期的东西。" };
  }

  if (/在哪|放哪|还有|有没有|多少|吗[？?]?$/.test(s)) {
    const q = s.replace(/家里|还有|有没有|放哪了?|在哪(里|儿)?|多少|吗|呢|[？?。]/g, "").trim();
    const hits = findItems(items, q);
    return hits.length
      ? { type: "results", text: `找到 ${hits.length} 件「${q}」：`, items: hits }
      : { type: "text", text: `我在你的记录里没找到「${q}」。家里可能没有，或还没录入。` };
  }

  const ops: Op[] = [];
  for (const part of s.split(/[，,；;。]|还有|另外/).filter(Boolean)) {
    if (/用完|没了|吃完/.test(part)) {
      const name = part.replace(/(用完|没了|吃完)了?/, "").trim();
      const c = findItems(items, name);
      ops.push({ kind: "used_up", candidates: c, targetId: c.length === 1 ? c[0].id : undefined, label: name });
      continue;
    }
    const moved = part.match(/(.+?)我?(?:放到|挪到|放在了)(.+?)了?$/);
    if (moved && !/买/.test(part)) {
      const c = findItems(items, moved[1].trim());
      ops.push({ kind: "update", candidates: c, targetId: c.length === 1 ? c[0].id : undefined, patch: { location: moved[2] }, label: moved[1].trim() });
      continue;
    }
    const left = part.match(/(.+?)还剩([0-9]+|[一两二三四五六七八九十])/);
    if (left) {
      const c = findItems(items, left[1].trim());
      const n = Number(left[2]) || NUM[left[2]];
      ops.push({ kind: "update", candidates: c, targetId: c.length === 1 ? c[0].id : undefined, patch: { quantity: n }, label: left[1].trim() });
      continue;
    }
    if (/买|入|到了|放|囤/.test(part) || guessName(part)) {
      const q = part.match(new RegExp(`([0-9]+|[一两二三四五六七八九十])(${UNITS})`));
      const name = guessName(part) ?? part.replace(/刚|买了|入了|囤了/g, "").slice(0, 4);
      const loc = LOCS.find((l) => part.includes(l)) ?? "";
      let expiry: string | undefined;
      const ym = part.match(/(明年|今年)?([0-9一二三四五六七八九十]+)月/);
      if (ym) {
        const y = today.getFullYear() + (ym[1] === "明年" ? 1 : 0);
        const mo = Number(ym[2]) || NUM[ym[2]] || 1;
        expiry = `${y}-${String(mo).padStart(2, "0")}-01`;
      }
      const low: string[] = [];
      if (!loc) low.push("location");
      if (!q) low.push("quantity");
      ops.push({
        kind: "add",
        lowConf: low,
        item: {
          name,
          category: CATS.find(([r]) => r.test(name))?.[1] ?? "日用品",
          quantity: q ? Number(q[1]) || NUM[q[1]] : 1,
          unit: q?.[2] ?? "个",
          location: loc || "未指定",
          expiry,
          source,
        },
      });
    }
  }
  if (ops.length) return { type: "confirm", ops };
  return { type: "text", text: "我没太听懂。可以试试「买了两瓶酱油放厨房上柜」或「电池放哪了」。" };
}

export const PHOTO_DEMO: Reply = {
  type: "confirm",
  ops: [
    { kind: "add", lowConf: ["expiry"], item: { name: "酸奶", category: "食品", quantity: 4, unit: "杯", location: "冰箱", expiry: d(7), source: "拍照" } },
    { kind: "add", lowConf: [], item: { name: "鸡蛋", category: "食品", quantity: 10, unit: "个", location: "冰箱", expiry: d(14), source: "拍照" } },
    { kind: "add", lowConf: ["quantity"], item: { name: "番茄酱", category: "调味品", quantity: 1, unit: "瓶", location: "冰箱", source: "拍照" } },
  ],
};

export const SHOT_DEMO: Reply = {
  type: "confirm",
  ops: [
    { kind: "add", lowConf: ["location"], item: { name: "抽纸", category: "日用品", quantity: 6, unit: "包", location: "未指定", source: "截图" } },
    { kind: "add", lowConf: ["location", "expiry"], item: { name: "洗衣液", category: "日用品", quantity: 1, unit: "桶", location: "未指定", source: "截图" } },
  ],
};
