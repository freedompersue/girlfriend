# 她在 SheZai

一个面向长期陪伴的 AI 关系应用，包含角色聊天、长期记忆、好感度、心情记录、里程碑、语音、图片、互动小游戏、疗愈模式和付费体系。

## 当前部署栈

- Framework: Next.js 16 / React 19 / Turbopack
- Database: Neon PostgreSQL，通过 `DATABASE_URL` 连接，不使用本地数据库
- ORM: Prisma 7，使用 `@prisma/adapter-pg`
- LLM: OpenRouter，模型由 `LLM_MODEL` 控制
- Image & TTS: MiniMax，仅用于图片生成和语音合成
- Auth: JWT + Better Auth，支持 Google OAuth；GitHub OAuth 可选
- Billing: Stripe 结构已接入，Stripe key 为空时支付功能不可用
- Deploy: Vercel，`vercel.json` 已配置每日 Cron

> `.env` 包含真实 Neon、OpenRouter、MiniMax、OAuth 等密钥，不要提交到 GitHub。生产环境建议把 `JWT_SECRET` 换成强随机值，并在 Vercel Project Settings 里逐项配置环境变量。

## 功能模块

- 角色选择：8 个角色，支持随机邂逅、MBTI 匹配、自然语言描述匹配。
- 普通聊天：角色 prompt + 长期记忆 + 关系状态 + 情绪共情 + 节日/生日/离开时长上下文。
- 关系系统：好感度、等级、签到、里程碑、通知。
- 记忆系统：用户画像提取、滚动聊天摘要、记忆面板。
- 心情系统：聊天后异步分析心情，生成心情日记。
- 付费体系：Free / Plus / Pro、Stripe Checkout、Portal、积分余额。
- 跨平台：Telegram/QQ 接入结构已预留。

## 互动系统

聊天页底部「互动」入口用于补足纯聊天的目标感和共同经历：

- 每日关系任务：每天生成 3 个任务，例如分享今天的小事、哄她开心、一起玩一局。
- 互动小游戏：真心话、22 问、猜心情、故事接龙。
- 心动瞬间：普通聊天或小游戏里触发强情绪表达时，会保存到互动面板。
- 好感奖励：完成任务、完成小游戏、触发心动瞬间都会给好感度奖励。

实现上没有新增数据库表，互动状态保存在现有 `user_profiles` 表的内部键 `__engagement_<characterId>` 中，并且记忆面板会过滤所有 `__` 内部记录，保证向上兼容。

## 疗愈模式

聊天页底部「疗愈」入口和普通聊天、互动小游戏相互独立，不显示好感度、积分、奖励或任务，目标是提供低刺激的陪伴和稳定练习。

第一阶段已实现：

- 被看见：深度镜映对话，少建议、慢节奏、优先承接情绪。
- 她在这里：稳定锚点，可选择 5 / 15 / 30 分钟安静陪伴。
- 一起呼吸：4-7-8 呼吸节奏练习。
- 安顿下来：5-4-3-2-1 grounding。
- 平行陪伴：10 / 25 分钟的低互动陪伴。
- 安全边界：首次进入显示非医疗声明；检测自伤/自杀关键词时，强制切换到安全支持话术。

权限设计：疗愈模式定位为 Pro 专属功能，但当前限时开放给普通用户。通过环境变量控制：

```bash
HEALING_FREE_TRIAL_OPEN="true"
```

如果以后要关闭普通用户试用，把它设为 `false` 即可。疗愈状态同样复用现有 `user_profiles` 表，内部键为 `__healing_<characterId>`，不需要新增 Prisma migration。

重要边界：疗愈模式只提供陪伴、镜映和稳定练习，不能替代专业心理咨询、医疗诊断或危机干预。若用户处于即时危险，应优先联系当地急救/报警电话、危机热线或现实中的可信任的人。

## 环境变量

本项目使用 Neon 作为远程 PostgreSQL 数据库，不需要启动本地 Postgres。最小可运行配置：

```bash
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
LLM_MODEL="minimax/minimax-m2.5:free"
JWT_SECRET="生成一个强随机字符串"
BETTER_AUTH_SECRET="生成一个强随机字符串"
BETTER_AUTH_URL="https://www.dreamgf.online"
NEXT_PUBLIC_APP_NAME="她在"
HEALING_FREE_TRIAL_OPEN="true"
```

可选配置：

- `MINIMAX_API_KEY` / `MINIMAX_BASE_URL`: 开启图片生成和 TTS。
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: 开启 Google 登录。
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: 开启 GitHub 登录。
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: 开启支付。
- `STRIPE_PLUS_PRICE_ID` / `STRIPE_PRO_PRICE_ID` / 积分 Price ID: 绑定 Stripe 商品价格。
- `TELEGRAM_BOT_TOKEN` / `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`: 开启 Telegram 接入。
- `CRON_SECRET`: 保护 Vercel Cron 接口。

## 本地开发

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。本地开发也会连接 `.env` 中的 Neon 数据库。

## 生产检查

推送或部署前运行：

```bash
npm run build
```

当前生产构建路径使用 Next.js 16 和 Prisma 7。互动系统与疗愈模式都复用现有表，不需要额外执行 Prisma migration。

`npm run lint` 当前会报告一些既有 React lint 错误，分布在 unrelated pages/hooks；它们不阻塞 `next build`，但如果 CI 强制跑 lint，需要单独清理。

## 部署到 Vercel

在 Vercel Project Settings -> Environment Variables 中配置 `.env.example` 里的变量。`DATABASE_URL` 使用 Neon 提供的连接串，确保带 `sslmode=require`。

部署前检查：

```bash
npm run build
```

如果未来修改了 `prisma/schema.prisma`，再执行相应的 Prisma 同步流程；当前互动系统和疗愈模式都没有新增表。
