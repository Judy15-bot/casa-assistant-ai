// 图片识别评测用例：每张图的"标准答案"。
// 图片放在 public/eval-images/ 下，文件名与 file 字段一致。
//
// 写法说明：
// - items 列出图中应当识别出的物品；name 填可接受的写法，模型输出包含任意一个即算对
// - expiry 填具体日期，表示图上能看清过期日；填 null 表示图上看不到过期日，
//   此时模型应当留空或标为不确定，直接填一个日期算"编造日期"
// - quantity 可填多个可接受的数（如一盒 240 贴，填 1 或 240 都算对）
// - unreadable: true 表示图片看不清，模型应当不生成任何物品、提示重拍

export type ImageScene = "单件标签" | "多件场景" | "订单截图";

export type ExpectedImageItem = {
  name: string[];
  quantity?: number[];
  expiry: string | null;
  category?: string;
};

export type ImageCase = {
  id: string;
  file: string;
  scene: ImageScene;
  /** 这张图在考什么 */
  tests: string[];
  expect: { items: ExpectedImageItem[]; unreadable?: boolean };
};

export const IMAGE_CASES: ImageCase[] = [
  {
    id: "img01",
    file: "img01.jpg",
    scene: "单件标签",
    tests: ["这一面没有印品名，只印了成份，需要推断", "看不到日期"],
    expect: { items: [{ name: ["积雪"], quantity: [1], expiry: null, category: "药品" }] },
  },
  {
    id: "img02",
    file: "img02.jpg",
    scene: "单件标签",
    tests: ["有效期写着「见管尾」，图上看不到", "看不到日期"],
    expect: { items: [{ name: ["阿达帕林"], quantity: [1], expiry: null, category: "药品" }] },
  },
  {
    id: "img03",
    file: "img03.jpg",
    scene: "单件标签",
    tests: ["日期压印在管尾，字很小看不清", "看不到日期"],
    expect: { items: [{ name: ["熊胆痔灵"], quantity: [1], expiry: null, category: "药品" }] },
  },
  {
    id: "img04",
    file: "img04.jpg",
    scene: "单件标签",
    tests: ["大量地址、许可证文字干扰", "写了保质期 3 年，但限用日期见喷码，图上看不到", "看不到日期"],
    expect: { items: [{ name: ["卫生巾", "七度空间"], quantity: [1, 10], expiry: null, category: "日用品" }] },
  },
  {
    id: "img05",
    file: "img05.jpg",
    scene: "单件标签",
    tests: ["严重模糊，文字无法辨认，应提示重拍"],
    expect: { items: [], unreadable: true },
  },
  {
    id: "img06",
    file: "img06.jpg",
    scene: "单件标签",
    tests: ["图片旋转了 90 度", "包含酱包、油包等多个配料包，不应拆成多件物品", "保质期 7 个月，生产日期见内包装，看不到", "看不到日期"],
    expect: { items: [{ name: ["土豆粉"], quantity: [1], expiry: null, category: "食品" }] },
  },
  {
    id: "img07",
    file: "img07.jpg",
    scene: "单件标签",
    tests: ["同时印了两个日期：2026/08/17 是生产日期，2027/01/16 是保质期至", "区分生产日期和过期日期"],
    expect: { items: [{ name: ["KK星", "kk星"], quantity: [1], expiry: "2027-01-16", category: "食品" }] },
  },
  {
    id: "img08",
    file: "img08.jpg",
    scene: "单件标签",
    tests: ["保质期 12 个月，但生产日期在正面，图上看不到", "看不到日期"],
    expect: { items: [{ name: ["芝麻"], quantity: [1], expiry: null, category: "调味品" }] },
  },
  {
    id: "img09",
    file: "img09.jpg",
    scene: "单件标签",
    tests: ["中英文混排", "包装上没有日期"],
    expect: { items: [{ name: ["透气乳", "UPAI", "U牌"], quantity: [1], expiry: null, category: "护肤品" }] },
  },
  {
    id: "img10",
    file: "img10.jpg",
    scene: "单件标签",
    tests: ["全日文包装", "包装上没有日期"],
    expect: {
      items: [{ name: ["珂润", "Curél", "Curel", "キュレル", "化妆水", "化粧水"], quantity: [1], expiry: null, category: "护肤品" }],
    },
  },
  {
    id: "img11",
    file: "img11.jpg",
    scene: "单件标签",
    tests: ["日期写成 EXP:2028/12/23", "规格 240 贴，数量容易误读"],
    expect: { items: [{ name: ["双眼皮贴"], quantity: [1, 240], expiry: "2028-12-23" }] },
  },
];
