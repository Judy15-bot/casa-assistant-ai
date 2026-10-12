// 评测用的固定物品清单和固定日期。
// 评测不读写真实数据库：每条用例都基于同一份清单和同一个"今天"，结果才可复现、可对比。

import type { PromptItem } from "@/lib/prompts";

export const EVAL_TODAY = "2026-10-12";

export const EVAL_ITEMS: PromptItem[] = [
  { id: "i01", name: "酱油", category: "调味品", quantity: 1, unit: "瓶", location: "厨房上柜", expiry: "2027-03-01" },
  { id: "i02", name: "牛奶", category: "食品", quantity: 2, unit: "盒", location: "冰箱", expiry: "2026-10-15" },
  { id: "i03", name: "防晒霜", category: "护肤品", quantity: 1, unit: "支", location: "卧室抽屉", expiry: "2026-11-20" },
  { id: "i04", name: "防晒霜", category: "护肤品", quantity: 1, unit: "支", location: "背包", expiry: "2027-05-01" },
  { id: "i05", name: "5号电池", category: "日用品", quantity: 8, unit: "节", location: "电视柜抽屉", expiry: null },
  { id: "i06", name: "纸巾", category: "日用品", quantity: 3, unit: "包", location: "卫生间柜子", expiry: null },
  { id: "i07", name: "布洛芬", category: "药品", quantity: 1, unit: "盒", location: "药箱", expiry: "2026-10-18" },
  { id: "i08", name: "洗洁精", category: "日用品", quantity: 2, unit: "瓶", location: "水槽下", expiry: "2027-12-01" },
  { id: "i09", name: "鸡蛋", category: "食品", quantity: 10, unit: "个", location: "冰箱", expiry: "2026-10-25" },
  { id: "i10", name: "洗发水", category: "日用品", quantity: 1, unit: "瓶", location: "浴室", expiry: "2027-08-01" },
  { id: "i11", name: "面膜", category: "护肤品", quantity: 5, unit: "片", location: "卧室抽屉", expiry: "2026-10-14" },
  { id: "i12", name: "大米", category: "食品", quantity: 1, unit: "袋", location: "厨房下柜", expiry: "2027-04-01" },
  { id: "i13", name: "创可贴", category: "药品", quantity: 1, unit: "盒", location: "药箱", expiry: "2028-01-01" },
  { id: "i14", name: "垃圾袋", category: "日用品", quantity: 2, unit: "卷", location: "厨房下柜", expiry: null },
  { id: "i15", name: "酸奶", category: "食品", quantity: 4, unit: "杯", location: "冰箱", expiry: "2026-10-13" },
  { id: "i16", name: "维生素C", category: "药品", quantity: 1, unit: "瓶", location: "书桌抽屉", expiry: "2027-02-01" },
];
