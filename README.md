# 家底 · 家庭物品管理

移动端优先的家庭物品管理应用。用一句中文录入物品，随时问「家里有没有 XX」「XX 放在哪」「什么快过期了」，
所有新增、修改、标记用完都会先弹出确认卡片，你点确认才写入。

## 功能

- **AI 助手**（`/ai`）：自然语言录入、查询、修改、标记用完；支持拍照识别与订单截图，一句话包含多件事也能一次解析。
- **首页**（`/`）：本周过期提醒、即将过期列表、「试试这样问」快捷入口。
- **物品**（`/items`）：搜索、按名称筛选、手动新增、点击编辑、删除前二次确认；可按位置或品类分组浏览。
- **消息 / 设置**（`/notifications`、`/settings`）：版本更新等通知；设置内查看账号与退出登录。
- **云端保存**：邮箱密码与 Google 登录，物品清单按人存储，换设备刷新后仍在。

## 技术栈

- [TanStack Start](https://tanstack.com/start) v1（React 19 + Vite，文件式路由，SSR）
- TypeScript、Tailwind CSS v4（设计令牌见 `src/styles.css`）、shadcn/ui
- Lovable Cloud（Postgres + Auth + RLS，客户端在 `src/integrations/supabase/`）
- [Vercel AI SDK](https://ai-sdk.dev) v7 + Lovable AI Gateway（模型 `openai/gpt-6-astra`）

## 目录结构

```text
src/
  routes/          页面（文件式路由，__root.tsx 为唯一根布局）
    index.tsx        首页：过期提醒 + 快捷问法
    ai.tsx           AI 助手：对话、确认卡片、输入框（打字/语音/拍照/截图）
    items.tsx        物品：搜索、新增、编辑抽屉、分组浏览
    notifications.tsx 通知列表
    settings.tsx     设置：账号、版本、退出登录
  lib/
    ai.server.ts     服务器侧调用大模型（runHomeAi），结构化输出 + 额度/限流错误提示
    ai.functions.ts  createServerFn askHomeAi：带登录校验，把文字/图片/历史交给模型
    home-ai.ts       Item 类型与确认卡片相关逻辑
    store.ts         登录态与物品清单的共享状态（读写云端 items 表）
    notices.ts       内置通知文案
  components/        AuthGate 登录、BottomNav 底部导航、HeaderActions 顶部按钮、shared 通用卡片
  integrations/      自动生成的 Cloud 客户端与鉴权中间件（不要手改）
drizzle/migrations/  建表与 RLS 迁移 SQL
```

## 数据模型

`public.items`（RLS：每个人只能读写自己的记录）

| 字段 | 说明 |
| --- | --- |
| `id` | uuid 主键 |
| `user_id` | 归属用户，默认取登录用户 |
| `name` | 物品名称 |
| `category` | 品类，默认「日用品」 |
| `quantity` / `unit` | 数量与单位，默认 1 个 |
| `location` | 存放位置，默认「未指定」 |
| `expiry` | 过期日期，可空 |
| `source` | 来源标记：文字 / 语音 / 拍照 / 截图 / 手动 |
| `created_at` | 创建时间 |

## 本地运行

需要 Node.js 20+ 与 [bun](https://bun.sh)（或 npm）。

```sh
git clone <本仓库地址>
cd <仓库名>
bun install        # 或 npm i
bun run dev        # 或 npm run dev，默认 http://localhost:8080
```

其他命令：

```sh
bun run build      # 生产构建
bun run preview    # 预览构建结果
bun run lint       # 代码检查
bun run test       # 单元测试
```

## 环境变量

- 浏览器侧：`VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`、`VITE_SUPABASE_PROJECT_ID`
  （由 Lovable Cloud 自动生成，放在 `.env`，已在 `.gitignore` 中）
- 服务器侧：`LOVABLE_API_KEY`，AI 调用所需，只在服务器读取，不会下发到浏览器

自行部署到其它平台时，需要在你自己的托管环境里重新配置以上变量；物品数据不在代码仓库里，
需在 Cloud 后台单独导出。

## AI 调用链

```text
输入（文字 / 语音 / 图片）
  → askHomeAi（server function，校验登录）
  → runHomeAi（服务器读取 LOVABLE_API_KEY，调用大模型，结构化输出）
  → 返回 { reply_text, result_item_ids, ops[] }
  → 前端渲染确认卡片，用户确认后才写 items 表
```

`ops` 里每条改动带 `low_confidence_fields`，解析没把握的字段会在卡片里标出来让你改。
模型密钥只在服务器，前端拿不到；额度用尽或限流会返回中文提示。

## 与 Lovable / GitHub 同步

连接 GitHub 后，本仓库与 Lovable 项目双向同步：在 Lovable 里的改动会自动推到这里，推送到已连接分支的改动也会同步回编辑器。
`src/integrations/supabase/` 下的客户端、`src/routeTree.gen.ts` 等为自动生成文件，请勿手改。
