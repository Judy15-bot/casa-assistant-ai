import { describe, expect, it } from "vitest";
import type { AiOut } from "@/lib/ai.server";
import { runBaseline } from "@/eval/baseline";
import { EVAL_CASES } from "@/eval/cases";
import { EVAL_ITEMS } from "@/eval/fixtures";
import { scoreCase, summarize } from "@/eval/score";

const byId = (id: string) => {
  const c = EVAL_CASES.find((x) => x.id === id);
  if (!c) throw new Error(`no case ${id}`);
  return c;
};
const op = (o: Partial<AiOut["ops"][number]> & Pick<AiOut["ops"][number], "kind" | "name">): AiOut["ops"][number] => ({
  item_id: null,
  category: null,
  quantity: null,
  unit: null,
  location: null,
  expiry: null,
  low_confidence_fields: [],
  ...o,
});
const out = (o: Partial<AiOut>): AiOut => ({ reply_text: "", result_item_ids: [], ops: [], ...o });

describe("评测数据", () => {
  it("共 70 条：50 条录入 + 20 条查询，id 不重复", () => {
    expect(EVAL_CASES).toHaveLength(70);
    expect(EVAL_CASES.filter((c) => c.kind === "record")).toHaveLength(50);
    expect(EVAL_CASES.filter((c) => c.kind === "query")).toHaveLength(20);
    expect(new Set(EVAL_CASES.map((c) => c.id)).size).toBe(70);
  });

  it("期望结果里引用的物品 id 都在固定清单中", () => {
    const ids = new Set(EVAL_ITEMS.map((i) => i.id));
    for (const c of EVAL_CASES) {
      for (const id of c.expect.results ?? []) expect(ids.has(id), `${c.id} ${id}`).toBe(true);
      for (const o of c.expect.ops) if (o.item_id) expect(ids.has(o.item_id), `${c.id} ${o.item_id}`).toBe(true);
    }
  });
});

describe("打分", () => {
  it("完全正确的录入通过", () => {
    const s = scoreCase(byId("A01"), {
      id: "A01",
      out: out({
        ops: [op({ kind: "add", name: "酱油", quantity: 2, location: "厨房上柜", expiry: "2027-03-01", category: "调味品" })],
      }),
    });
    expect(s.pass).toBe(true);
  });

  it("一句多操作不计顺序", () => {
    const s = scoreCase(byId("M01"), {
      id: "M01",
      out: out({
        ops: [op({ kind: "add", name: "醋", quantity: 1, location: "厨房上柜" }), op({ kind: "used_up", name: "酱油", item_id: "i01" })],
      }),
    });
    expect(s.pass).toBe(true);
  });

  it("同名歧义时直接选了某一件，记为匹配错物品", () => {
    const s = scoreCase(byId("G01"), { id: "G01", out: out({ ops: [op({ kind: "used_up", name: "防晒霜", item_id: "i03" })] }) });
    expect(s.pass).toBe(false);
    expect(s.errors).toContain("匹配错物品");
  });

  it("日期和数量出错分别记录", () => {
    const s = scoreCase(byId("A01"), {
      id: "A01",
      out: out({ ops: [op({ kind: "add", name: "酱油", quantity: 1, location: "厨房上柜", expiry: "2027-03-31", category: "调味品" })] }),
    });
    expect(s.errors).toEqual(["数量错误", "日期错误"]);
  });

  it("没说位置却填了位置且未标不确定，记为置信度未标出", () => {
    const s = scoreCase(byId("A05"), { id: "A05", out: out({ ops: [op({ kind: "add", name: "橄榄油", quantity: 1, location: "厨房" })] }) });
    expect(s.errors).toContain("置信度未标出");
    const ok = scoreCase(byId("A05"), {
      id: "A05",
      out: out({ ops: [op({ kind: "add", name: "橄榄油", quantity: 1, location: "厨房", low_confidence_fields: ["location"] })] }),
    });
    expect(ok.pass).toBe(true);
  });

  it("查询：两件都要返回，漏一件不通过", () => {
    expect(scoreCase(byId("R03"), { id: "R03", out: out({ result_item_ids: ["i04", "i03"] }) }).pass).toBe(true);
    const s = scoreCase(byId("R03"), { id: "R03", out: out({ result_item_ids: ["i03"] }) });
    expect(s.errors).toEqual(["查询结果错误"]);
  });

  it("清单里没有却返回了物品，记为幻觉", () => {
    expect(scoreCase(byId("R08"), { id: "R08", out: out({ result_item_ids: ["i01"] }) }).errors).toEqual(["幻觉"]);
    expect(scoreCase(byId("R01"), { id: "R01", out: out({ result_item_ids: ["x99"] }) }).errors).toEqual(["幻觉"]);
  });

  it("查询却生成了写操作，记为意图错误；调用失败单独记录", () => {
    expect(scoreCase(byId("R15"), { id: "R15", out: out({ ops: [op({ kind: "add", name: "纸巾" })] }) }).errors).toEqual(["意图错误"]);
    expect(scoreCase(byId("A02"), { id: "A02", out: null, error: "限流" }).errors).toEqual(["调用失败"]);
  });
});

describe("正则基线", () => {
  it("能跑完全部用例并汇总", () => {
    const scores = EVAL_CASES.map((c) => scoreCase(c, runBaseline(c)));
    const sum = summarize(scores);
    expect(sum.overall.total).toBe(70);
    console.log(
      `\n正则基线：总体 ${sum.overall.passed}/70（${(sum.overall.accuracy * 100).toFixed(0)}%），` +
        `录入 ${sum.record.passed}/50，查询 ${sum.query.passed}/20\n` +
        sum.byGroup.map((g) => `  ${g.group}: ${g.passed}/${g.total}`).join("\n") +
        "\n出错类别：" +
        sum.byError.map((e) => `${e.tag} ${e.count}`).join("，"),
    );
  });
});
