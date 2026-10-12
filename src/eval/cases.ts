// 评测用例：50 条录入 + 20 条查询。
// 所有用例都基于 fixtures.ts 中的固定清单，"今天"固定为 2026-10-12。
//
// 写法说明：
// - name / location 填可接受的写法列表，模型输出包含其中任意一个即算对
// - quantity 可填一个数，或多个可接受的数
// - item_id 填清单中的 id；填 null 表示"有歧义，应当不确定"
// - low_conf 表示这些字段应被标为低置信度（或直接留空）
// - 只检查写出来的字段，没写的字段不计分
// - 查询类用例的 results 要和模型返回的 result_item_ids 完全一致（不计顺序）

export type FieldName = "quantity" | "location" | "expiry";

export type ExpectedOp = {
  kind: "add" | "update" | "used_up";
  item_id?: string | null;
  name?: string[];
  quantity?: number | number[];
  location?: string[];
  expiry?: string;
  category?: string;
  low_conf?: FieldName[];
};

export type CaseGroup =
  | "新增"
  | "带日期新增"
  | "移动位置"
  | "修改数量"
  | "标记用完"
  | "一句多操作"
  | "同名歧义"
  | "口语与错字"
  | "查位置"
  | "查有无"
  | "查过期"
  | "买前查重"
  | "闲聊";

export type EvalCase = {
  id: string;
  kind: "record" | "query";
  group: CaseGroup;
  input: string;
  expect: { ops: ExpectedOp[]; results?: string[] };
  note?: string;
};

const add = (o: Omit<ExpectedOp, "kind">): ExpectedOp => ({ kind: "add", ...o });
const upd = (o: Omit<ExpectedOp, "kind">): ExpectedOp => ({ kind: "update", ...o });
const used = (item_id: string | null, name?: string[]): ExpectedOp => ({ kind: "used_up", item_id, ...(name ? { name } : {}) });

const rec = (id: string, group: CaseGroup, input: string, ops: ExpectedOp[], note?: string): EvalCase => ({
  id,
  kind: "record",
  group,
  input,
  expect: { ops },
  ...(note ? { note } : {}),
});
const ask = (id: string, group: CaseGroup, input: string, results: string[], note?: string): EvalCase => ({
  id,
  kind: "query",
  group,
  input,
  expect: { ops: [], results },
  ...(note ? { note } : {}),
});

export const EVAL_CASES: EvalCase[] = [
  // ---------- 录入：新增（12） ----------
  rec("A01", "新增", "刚买了两瓶酱油，放厨房上柜，明年三月过期", [
    add({ name: ["酱油"], quantity: 2, location: ["厨房上柜"], expiry: "2027-03-01", category: "调味品" }),
  ]),
  rec("A02", "新增", "买了一盒草莓放冰箱", [add({ name: ["草莓"], quantity: 1, location: ["冰箱"], category: "食品" })]),
  rec("A03", "新增", "入了三支牙膏，放卫生间柜子", [add({ name: ["牙膏"], quantity: 3, location: ["卫生间"] })]),
  rec("A04", "新增", "囤了12卷卫生纸放阳台", [add({ name: ["卫生纸"], quantity: 12, location: ["阳台"] })]),
  rec("A05", "新增", "新买了一瓶橄榄油", [add({ name: ["橄榄油"], quantity: 1, low_conf: ["location"] })], "没说位置，应标为不确定"),
  rec("A06", "新增", "买了一盒感冒药放药箱，2027年6月过期", [
    add({ name: ["感冒药"], quantity: 1, location: ["药箱"], expiry: "2027-06-01", category: "药品" }),
  ]),
  rec("A07", "新增", "到了一箱矿泉水，24瓶，放门口", [add({ name: ["矿泉水"], quantity: [24, 1], location: ["门口"] })]),
  rec("A08", "新增", "买了酸奶", [add({ name: ["酸奶"], low_conf: ["location"] })], "清单里已有酸奶，但这是新买的，应为新增"),
  rec("A09", "新增", "我把新买的保鲜膜放厨房抽屉了", [add({ name: ["保鲜膜"], location: ["厨房抽屉"] })], "句式像移动位置，实为新增"),
  rec("A10", "新增", "买了两袋速冻饺子放冷冻室，保质期到明年一月", [
    add({ name: ["饺子"], quantity: 2, location: ["冷冻"], expiry: "2027-01-01" }),
  ]),
  rec("A11", "新增", "买了一瓶身体乳，放浴室", [add({ name: ["身体乳"], quantity: 1, location: ["浴室"], category: "护肤品" })]),
  rec("A12", "新增", "购入猫粮一袋，放阳台", [add({ name: ["猫粮"], quantity: 1, location: ["阳台"] })]),

  // ---------- 录入：带日期新增（6） ----------
  rec("A13", "带日期新增", "买了一盒牛奶放冰箱，10月20号过期", [add({ name: ["牛奶"], quantity: 1, location: ["冰箱"], expiry: "2026-10-20" })]),
  rec("A14", "带日期新增", "买了面包，后天过期", [add({ name: ["面包"], expiry: "2026-10-14" })]),
  rec("A15", "带日期新增", "买了一瓶眼药水放药箱，2026年12月过期", [add({ name: ["眼药水"], quantity: 1, location: ["药箱"], expiry: "2026-12-01" })]),
  rec("A16", "带日期新增", "买了三包方便面放厨房下柜，保质期到2027年3月15日", [
    add({ name: ["方便面"], quantity: 3, location: ["厨房下柜"], expiry: "2027-03-15" }),
  ]),
  rec("A17", "带日期新增", "买了一袋吐司，一周后过期", [add({ name: ["吐司"], quantity: 1, expiry: "2026-10-19" })]),
  rec("A18", "带日期新增", "买了一盒鸡胸肉放冰箱，10天后过期", [add({ name: ["鸡胸肉"], quantity: 1, location: ["冰箱"], expiry: "2026-10-22" })]),

  // ---------- 录入：移动位置（6） ----------
  rec("U01", "移动位置", "电池我挪到书桌抽屉了", [upd({ item_id: "i05", location: ["书桌抽屉"] })]),
  rec("U02", "移动位置", "洗洁精放到阳台了", [upd({ item_id: "i08", location: ["阳台"] })]),
  rec("U03", "移动位置", "把布洛芬放进背包了", [upd({ item_id: "i07", location: ["背包"] })]),
  rec("U04", "移动位置", "大米移到厨房上柜了", [upd({ item_id: "i12", location: ["厨房上柜"] })]),
  rec("U05", "移动位置", "洗发水我放到卫生间柜子了", [upd({ item_id: "i10", location: ["卫生间柜子"] })]),
  rec("U06", "移动位置", "维生素C放到厨房上柜了", [upd({ item_id: "i16", location: ["厨房上柜"] })]),

  // ---------- 录入：修改数量（5） ----------
  rec("Q01", "修改数量", "纸巾还剩一包", [upd({ item_id: "i06", quantity: 1 })]),
  rec("Q02", "修改数量", "鸡蛋还剩4个", [upd({ item_id: "i09", quantity: 4 })]),
  rec("Q03", "修改数量", "面膜还剩两片", [upd({ item_id: "i11", quantity: 2 })]),
  rec("Q04", "修改数量", "电池用了两节", [upd({ item_id: "i05", quantity: 6 })], "需要用原数量 8 做减法"),
  rec("Q05", "修改数量", "垃圾袋只剩一卷了", [upd({ item_id: "i14", quantity: 1 })]),

  // ---------- 录入：标记用完（5） ----------
  rec("D01", "标记用完", "牛奶喝完了", [used("i02")]),
  rec("D02", "标记用完", "创可贴用完了", [used("i13")]),
  rec("D03", "标记用完", "酸奶吃完了", [used("i15")]),
  rec("D04", "标记用完", "把过期的布洛芬扔了", [used("i07")]),
  rec("D05", "标记用完", "洗发水没了", [used("i10")]),

  // ---------- 录入：一句多操作（6） ----------
  rec("M01", "一句多操作", "酱油用完了，又买了一瓶醋放厨房上柜", [
    used("i01"),
    add({ name: ["醋"], quantity: 1, location: ["厨房上柜"] }),
  ]),
  rec("M02", "一句多操作", "买了两盒牛奶放冰箱，鸡蛋还剩两个", [
    add({ name: ["牛奶"], quantity: 2, location: ["冰箱"] }),
    upd({ item_id: "i09", quantity: 2 }),
  ]),
  rec("M03", "一句多操作", "纸巾用完了，电池放到客厅了", [used("i06"), upd({ item_id: "i05", location: ["客厅"] })]),
  rec("M04", "一句多操作", "买了洗衣液和柔顺剂，都放阳台", [
    add({ name: ["洗衣液"], location: ["阳台"] }),
    add({ name: ["柔顺剂"], location: ["阳台"] }),
  ]),
  rec("M05", "一句多操作", "面膜用完了，大米也吃完了", [used("i11"), used("i12")]),
  rec("M06", "一句多操作", "买了一盒创可贴放药箱，另外洗洁精挪到水槽上面了", [
    add({ name: ["创可贴"], quantity: 1, location: ["药箱"] }),
    upd({ item_id: "i08", location: ["水槽上"] }),
  ]),

  // ---------- 录入：同名歧义（4）——清单里有两支防晒霜 ----------
  rec("G01", "同名歧义", "防晒霜用完了", [used(null, ["防晒"])], "两支防晒霜，应当不确定是哪支"),
  rec("G02", "同名歧义", "防晒霜放到浴室了", [upd({ item_id: null, name: ["防晒"], location: ["浴室"] })], "两支防晒霜，应当不确定是哪支"),
  rec("G03", "同名歧义", "背包里的防晒霜用完了", [used("i04")], "用位置区分出是哪一支"),
  rec("G04", "同名歧义", "卧室抽屉那支防晒霜放到包里了", [upd({ item_id: "i03", location: ["包"] })], "用位置区分出是哪一支"),

  // ---------- 录入：口语与错字（6） ----------
  rec("C01", "口语与错字", "搞了俩瓶老干妈放橱柜", [add({ name: ["老干妈"], quantity: 2, location: ["橱柜"] })]),
  rec("C02", "口语与错字", "酱油木有了", [used("i01")]),
  rec("C03", "口语与错字", "bought 2 bottles of shampoo, put in bathroom", [
    add({ name: ["洗发水", "shampoo"], quantity: 2, location: ["浴室", "卫生间", "bathroom"] }),
  ]),
  rec("C04", "口语与错字", "鸡旦还有六个", [upd({ item_id: "i09", quantity: 6 })], "错别字"),
  rec("C05", "口语与错字", "那个电池嘛 我放电视柜上面了", [upd({ item_id: "i05", location: ["电视柜上"] })]),
  rec("C06", "口语与错字", "买了点苹果 冰箱", [add({ name: ["苹果"], location: ["冰箱"] })]),

  // ---------- 查询：查位置（5） ----------
  ask("R01", "查位置", "电池放哪了", ["i05"]),
  ask("R02", "查位置", "布洛芬在哪", ["i07"]),
  ask("R03", "查位置", "防晒霜在哪", ["i03", "i04"], "两支都要返回"),
  ask("R04", "查位置", "大米放哪儿了", ["i12"]),
  ask("R05", "查位置", "维C在哪", ["i16"], "简称"),

  // ---------- 查询：查有无（5） ----------
  ask("R06", "查有无", "家里还有酱油吗", ["i01"]),
  ask("R07", "查有无", "有没有洗洁精", ["i08"]),
  ask("R08", "查有无", "家里有咖啡吗", [], "清单里没有，不能编造"),
  ask("R09", "查有无", "有没有咳嗽糖浆", [], "清单里没有，不能编造"),
  ask("R10", "查有无", "家里有洗衣液吗", [], "清单里没有，不能编造"),

  // ---------- 查询：查过期（4） ----------
  ask("R11", "查过期", "这周有什么快过期", ["i15", "i11", "i02", "i07"], "截至 10-18"),
  ask("R12", "查过期", "明天过期的有哪些", ["i15"]),
  ask("R13", "查过期", "冰箱里一周内过期的有哪些", ["i15", "i02"]),
  ask("R14", "查过期", "药箱里的药什么时候过期", ["i07", "i13"]),

  // ---------- 查询：买前查重（4） ----------
  ask("R15", "买前查重", "我想买纸巾", ["i06"]),
  ask("R16", "买前查重", "要不要买鸡蛋", ["i09"]),
  ask("R17", "买前查重", "想买防晒", ["i03", "i04"]),
  ask("R18", "买前查重", "想买咖啡", [], "清单里没有，不能编造"),

  // ---------- 查询：闲聊（2） ----------
  ask("R19", "闲聊", "你好", []),
  ask("R20", "闲聊", "今天天气怎么样", []),
];
