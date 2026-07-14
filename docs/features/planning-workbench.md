---
title: 智能规划工作台
date: 2026-07-12
type: feature
layer: fullstack
---

## 功能概述

实现产品的核心功能——智能规划工作台（Phase 2）。用户通过自然语言对话描述出行需求，AI Agent 自动生成完整亲子行程，并支持可视化预览、自然语言修改、知识库联动和方案对比。全栈实现包含三栏布局、SSE 流式通信、AI Agent 编排层、Itinerary CRUD 和 MCP 工具封装。

## 变更文件清单

### 前端 — PlanView 三栏布局与路由

| 文件                            | 操作 | 说明                                                                          |
| ------------------------------- | ---- | ----------------------------------------------------------------------------- |
| `client/src/views/PlanView.vue` | 新建 | 三栏容器，`fixed inset-0 top-14` 突破 DefaultLayout 的 `max-w-7xl` 约束       |
| `client/src/router/index.ts`    | 修改 | 添加 `/plan` 路由，指向 PlanView（作为 DefaultLayout 子路由但不渲染侧边导航） |

### 前端 — AI 对话面板

| 文件                                              | 操作 | 说明                                                                                                                |
| ------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------- |
| `client/src/components/plan/ChatPanel.vue`        | 新建 | 右栏 AI 对话：欢迎消息、消息气泡列表、输入框（Enter 发送）、集成 ProgressSkeleton / QuickActions / KnowledgeRefCard |
| `client/src/components/plan/ProgressSkeleton.vue` | 新建 | 5 步进度指示器（pending / running / completed / failed），loading 状态展示                                          |
| `client/src/components/plan/QuickActions.vue`     | 新建 | 4 个快捷按钮：放慢节奏/更换酒店/压缩预算/增加美食，`hasPlan` 控制前两个 disabled                                    |
| `client/src/components/plan/KnowledgeRefCard.vue` | 新建 | 蓝色知识引用卡片，显示标题和来源，点击跳转 `/knowledge/{id}`                                                        |

### 前端 — 行程可视化

| 文件                                            | 操作 | 说明                                                                                                |
| ----------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------- |
| `client/src/components/plan/TimelineCenter.vue` | 新建 | 中间区域：空状态（快捷示例按钮）+ 总览条（标题/亲子度评分/预算/图例行/导出PDF）+ DayCard 可滚动列表 |
| `client/src/components/plan/DayCard.vue`        | 新建 | 每日卡片：左侧 4px 彩色边框按节点类型着色、天数头部 + 节奏描述、Today 标签、TimelineNode 列表       |
| `client/src/components/plan/TimelineNode.vue`   | 新建 | 节点渲染：虚线连接线、Emoji 图标、时间/标题/费用、备注文本、知识标签（📚）                          |

### 前端 — 行程大纲与方案对比

| 文件                                            | 操作 | 说明                                                                                              |
| ----------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------- |
| `client/src/components/plan/OutlineSidebar.vue` | 新建 | 左栏：行程标题 + 成员信息、按天导航列表（高亮选中日）、底部工具按钮（方案对比/导出行程/出行清单） |
| `client/src/components/plan/PlanComparison.vue` | 新建 | Teleport 弹窗：两方案卡片含高铁/航班 radio 选择、合计费用计算、推荐标签，emit close/apply         |

### 前端 — API 层与 Store

| 文件                        | 操作 | 说明                                                                                                                                                                            |
| --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/api/plan.ts`    | 新建 | SSE 订阅函数（原生 `fetch` + `ReadableStream`）、`subscribeChat` / `subscribePlan` / `subscribeModify`，使用 `ROUTES.AI.*` 常量                                                 |
| `client/src/stores/plan.ts` | 新建 | Pinia store：`currentPlan` / `messages` / `progressSteps` / `showWelcome` / `isLoading` / `sseError`，方法：`startGeneration` / `startPlan` / `modifyPlan` / `cancelGeneration` |

### 前端 — 响应式

| 文件                                            | 操作 | 说明                                                                |
| ----------------------------------------------- | ---- | ------------------------------------------------------------------- |
| `client/src/components/plan/OutlineSidebar.vue` | 修改 | Sidebar 仅在 `lg:` 断点以上显示（`hidden lg:flex`），移动端自动隐藏 |

### 后端 — Itinerary CRUD

| 文件                                               | 操作 | 说明                                                                                                             |
| -------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------- |
| `server/src/itinerary/itinerary.module.ts`         | 新建 | 注册 ItineraryController + ItineraryService                                                                      |
| `server/src/itinerary/itinerary.controller.ts`     | 新建 | `GET/POST/PUT/DELETE /api/itineraries`，全部由 `@UseGuards(AuthGuard('jwt'))` 保护，按 `userId` 隔离             |
| `server/src/itinerary/itinerary.service.ts`        | 新建 | Prisma CRUD 操作，使用 `Prisma.ItineraryCreateInput` / `ItineraryUpdateInput` 强类型                             |
| `server/src/itinerary/dto/create-itinerary.dto.ts` | 新建 | 创建行程 DTO：`title`, `destination`, `startDate`, `endDate`, `adults`, `children`, `childAge`, `pace`, `budget` |
| `server/src/itinerary/dto/update-itinerary.dto.ts` | 新建 | 更新行程 DTO（`PartialType`），额外支持 `status`, `kidFriendly`, `itineraryJson`                                 |

### 后端 — AI SSE 端点

| 文件                             | 操作 | 说明                                                                                                          |
| -------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| `server/src/ai/ai.module.ts`     | 新建 | 注册 AiController + AiService                                                                                 |
| `server/src/ai/ai.controller.ts` | 新建 | `POST /api/ai/chat` / `POST /api/ai/plan` / `POST /api/ai/modify`，全部使用 `@Sse()` + `Observable`，jwt 保护 |
| `server/src/ai/ai.service.ts`    | 新建 | 动态 `import('@trip/ai')` 调用 AI Agent 层，planId 校验连接 Prisma Itinerary                                  |

### 后端 — App 注册

| 文件                       | 操作 | 说明                                |
| -------------------------- | ---- | ----------------------------------- |
| `server/src/app.module.ts` | 修改 | 导入 `ItineraryModule` + `AiModule` |

### AI Agent 层 — `packages/ai`

| 文件                               | 操作 | 说明                                                                                                                             |
| ---------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ai/package.json`                  | 新建 | `@trip/ai` 包，依赖 `@langchain/core`, `@langchain/langgraph`, `@langchain/openai`，ESM + CJS 双入口                             |
| `ai/src/index.ts`                  | 新建 | 导出 `IntentRouter`, `TravelPlanner`, `TravelModifier`, `KnowledgeQA` 和所有类型                                                 |
| `ai/src/types.ts`                  | 新建 | 共享类型：`UserRequirements`, `IntentResult`, `TripPlan`, `DayPlan`, `ItineraryNode`, `BudgetSummary`, `SSEEvent`, `SSECallback` |
| `ai/src/intent-router/router.ts`   | 新建 | `IntentRouter`：LLM (`gpt-4o-mini`) 分类 + 关键词降级（plan/modify/qa）                                                          |
| `ai/src/agents/travel-planner.ts`  | 新建 | `TravelPlanner`：顺序编排（并行的交通/住宿查询 → 景点查询 → LLM 生成行程 JSON），SSE 进度推送                                    |
| `ai/src/agents/travel-modifier.ts` | 新建 | `TravelModifier`：全量重新生成，输入当前行程 JSON + NL 修改指令                                                                  |
| `ai/src/agents/knowledge-qa.ts`    | 新建 | `KnowledgeQA`：LLM 问答（RAG 桩，未连接 pgvector）                                                                               |
| `ai/src/config/llm.ts`             | 新建 | LLM 配置：`fast`（gpt-4o-mini, 0.1 temp, 500 tokens）+ `strong`（gpt-4o, 0.3 temp, 2048 tokens）                                 |
| `ai/src/config/prompts.ts`         | 新建 | 提示词模板：`INTENT_ROUTER_PROMPT`, `TRAVEL_PLANNER_PROMPT`, `TRAVEL_MODIFIER_PROMPT`                                            |
| `ai/src/utils.ts`                  | 新建 | `safeReplace`：安全模板字符串替换                                                                                                |
| `ai/src/tools/transport.ts`        | 新建 | `TransportTool`：`searchFlights`/`searchTrains`，预设示例数据                                                                    |
| `ai/src/tools/accommodation.ts`    | 新建 | `AccommodationTool`：`search`，预设示例数据                                                                                      |
| `ai/src/tools/amap.ts`             | 新建 | `AmapTool`：`searchPOI`/`planRoute`，预设示例数据                                                                                |
| `ai/src/tools/knowledge.ts`        | 新建 | `KnowledgeTool`：`search`，返回空数组（桩）                                                                                      |

### 共享常量

| 文件                                   | 操作 | 说明                                                        |
| -------------------------------------- | ---- | ----------------------------------------------------------- |
| `packages/shared/src/constants/api.ts` | 修改 | 添加 `ROUTES.AI.CHAT`, `ROUTES.AI.PLAN`, `ROUTES.AI.MODIFY` |

## 关键设计决策

| 决策                    | 方案                                           | 原因                                                       |
| ----------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| 三栏布局实现            | `fixed inset-0 top-14` 突破父容器              | PlanView 需要全宽体验，不受 DefaultLayout `max-w-7xl` 限制 |
| SSE 实现方式            | 原生 `fetch` + `ReadableStream`                | 避免引入 SSE 第三方库，轻量可控                            |
| 消息格式                | `data: {JSON}\n`（无 `event:` 前缀）           | 简化解析逻辑，统一 `SSE_PREFIX_LENGTH = 6` 截断            |
| AI Agent 动态加载       | NestJS `await import('@trip/ai')`              | AI 包有 LangChain 依赖，按需加载避免启动时崩溃             |
| AI 包构建               | CJS 输出到 `dist/`，NestJS 通过 `require` 加载 | 兼容 NestJS CommonJS 模块系统                              |
| TravelModifier 实现方式 | 全量重新生成                                   | 避免差量更新导致的 JSON 结构不一致                         |
| IntentRouter 降级策略   | LLM 失败时关键词匹配                           | 保证极端情况下的可用性                                     |
| MCP 工具数据            | 预设示例数据（无真实 API 调用）                | MVP 阶段，真实凭据后续配置                                 |
| 方案对比数据            | 硬编码示例（上海虹桥 vs 无锡硕放）             | 演示阶段，后续接入真实交通数据                             |
| 知识引用卡片            | 点击跳转 `/knowledge/{id}`                     | 复用已有路由，保持导航一致性                               |

## 对外变更

### API 端点

| 方法   | 路径                   | 说明                     | 认证 |
| ------ | ---------------------- | ------------------------ | ---- |
| GET    | `/api/itineraries`     | 获取当前用户行程列表     | 是   |
| POST   | `/api/itineraries`     | 新建行程                 | 是   |
| GET    | `/api/itineraries/:id` | 获取行程详情             | 是   |
| PUT    | `/api/itineraries/:id` | 更新行程                 | 是   |
| DELETE | `/api/itineraries/:id` | 删除行程                 | 是   |
| POST   | `/api/ai/chat`         | AI 对话（SSE 流式）      | 是   |
| POST   | `/api/ai/plan`         | 生成新行程（SSE 流式）   | 是   |
| POST   | `/api/ai/modify`       | 修改已有行程（SSE 流式） | 是   |

### SSE 事件协议

```typescript
// 所有 SSE 端点使用统一的 data 行格式：
// data: {"type": "...", "data": {...}}\n

interface SSEEvent {
  type:
    | 'progress' // 进度更新
    | 'plan' // 行程 JSON { title, destination, members, days, budget, kidFriendlyScore }
    | 'message' // AI 文本消息 { content, knowledgeRefs? }
    | 'knowledge_ref' // 知识引用 { id, title }
    | 'error' // 错误 { message }
}
```

### 请求/响应示例

```json
POST /api/ai/chat
{"message": "去三亚5天，2大1小"}

// SSE 流式响应
data: {"type":"progress","data":{"step":1,"status":"completed","message":"已读取出行需求"}}
data: {"type":"progress","data":{"step":2,"status":"completed","message":"已查询交通信息"}}
data: {"type":"progress","data":{"step":3,"status":"completed","message":"已查询住宿信息"}}
data: {"type":"progress","data":{"step":4,"status":"completed","message":"已检索景点与酒店"}}
data: {"type":"progress","data":{"step":5,"status":"running","message":"正在生成每日行程…"}}
data: {"type":"progress","data":{"step":5,"status":"completed","message":"行程生成完成"}}
data: {"type":"plan","data":{"title":"三亚5日亲子游","destination":"三亚",...}}
```

### 数据模型变更

| 模型      | 字段            | 类型       | 说明                               |
| --------- | --------------- | ---------- | ---------------------------------- |
| Itinerary | `id`            | UUID       | 主键                               |
| Itinerary | `userId`        | String     | 外键 → User                        |
| Itinerary | `title`         | String     | 行程标题                           |
| Itinerary | `destination`   | String     | 目的地                             |
| Itinerary | `startDate`     | DateTime?  | 出发日期                           |
| Itinerary | `endDate`       | DateTime?  | 返回日期                           |
| Itinerary | `adults`        | Int        | 默认 2                             |
| Itinerary | `children`      | Int        | 默认 1                             |
| Itinerary | `childAge`      | Int?       | 儿童年龄                           |
| Itinerary | `pace`          | String?    | 节奏（relaxed/moderate/intense）   |
| Itinerary | `budget`        | Float?     | 预算                               |
| Itinerary | `kidFriendly`   | Float?     | 亲子度评分                         |
| Itinerary | `status`        | TripStatus | 枚举：DRAFT / PUBLISHED / ARCHIVED |
| Itinerary | `itineraryJson` | Json?      | 完整的行程 JSON（TripPlan）        |

## 架构图

```
client (Vue 3)                     server (NestJS)                ai (LangChain)
┌─────────────────────┐     SSE     ┌────────────────────┐     ┌────────────────────┐
│ PlanView.vue        │◄───────────│ AI Controller       │────►│ IntentRouter       │
│  ├─ OutlineSidebar  │  POST      │  /api/ai/chat       │     │  ├─ plan →         │
│  ├─ TimelineCenter  │  /api/ai/  │  /api/ai/plan       │     │  │ TravelPlanner    │
│  └─ ChatPanel       │  plan      │  /api/ai/modify     │     │  ├─ modify →       │
│                     │  /api/ai/  ├──────────────────────┤     │  │ TravelModifier   │
│ itinerary CRUD      │  modify    │ Itinerary Controller│     │  └─ qa →           │
│ GET/POST/PUT/DELETE │───────────►│  CRUD /itineraries   │     │  KnowledgeQA      │
└─────────────────────┘  REST      └─────────┬────────────┘     └────────┬───────────┘
                                              │                           │
                   ┌──────────────────────────┼───────────────────────────┼──────────┐
                   │ MCP Tools (ai/src/tools/)           │                           │
                   │  ├─ TransportTool (flights+trains)  ← preset data              │
                   │  ├─ AccommodationTool (hotels)       ← preset data              │
                   │  ├─ AmapTool (POI+routes)            ← preset data              │
                   │  └─ KnowledgeTool (RAG stub)         ← empty result             │
                   └─────────────────────────────────────────────────────────────────┘
```

## 测试结果

- `pnpm lint`：通过
- `pnpm typecheck`：client + server + ai 包均通过
- `pnpm -r build`：shared + ai + server(nest) + client(vite) 全部通过
- SSE 端点 `POST /api/ai/chat`：返回流式 progress → message 事件
- SSE 端点 `POST /api/ai/plan`：返回流式 progress → plan 事件
- SSE 端点 `POST /api/ai/modify`：需先保存行程（itineraryJson 非空），返回修改后 plan
- Itinerary CRUD 5 端点：全部正常返回，按 userId 隔离
- 前端三栏布局：左侧 OutlineSidebar(lg:显示)、中间 TimelineCenter、右侧 ChatPanel 正常渲染
- 方案对比弹窗：Teleport 到 body，遮罩层 + 两方案卡片正常显示

## Phase 2 Bug 修复清单 (2026-07-14)

| #   | 问题                                         | 严重度  | 修改文件                                             | 修复要点                                                                |
| --- | -------------------------------------------- | ------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | `modifyPlan` 不更新 `currentPlan`            | 🔴 核心 | `stores/plan.ts`                                     | PLAN 事件中添加 `currentPlan.value = event.data`                        |
| 2   | `itineraryId` 从未设置                       | 🔴 核心 | `stores/plan.ts`, `server/.../CreateItineraryDto.ts` | SSE 流结束后自动调 `createItinerary()`；Dto 补 `itineraryJson` 字段     |
| 3   | 进度骨架屏永不工作                           | 🔴 核心 | `ai/agent.ts`                                        | 在 `streamWithEvents` 中注入 `progress` 事件，映射 tool 调用到 5 个步骤 |
| 4   | `invokePlanner/Modifier` 无 JSON 容错        | 🔴 核心 | `ai/agent.ts`                                        | `JSON.parse()` 包 try-catch，失败时 throw 明确错误                      |
| 5   | `knowledge.ts` 函数签名忽略 `query`          | 🔴 核心 | `ai/tools/knowledge.ts`                              | 接受 `{ query }` 参数                                                   |
| 6   | SSE Observable 永不 complete                 | 🟠 高   | `ai.controller.ts`                                   | 加 `.then(() => subscriber.complete())`                                 |
| 7   | 快捷示例调用 stub REST                       | 🟠 高   | `TimelineCenter.vue`                                 | 改为调 `store.startGeneration(text)`                                    |
| 8   | `modifyPlan` 提前 return 时 isLoading 未复位 | 🟠 高   | `stores/plan.ts`                                     | 加 `isLoading.value = false`                                            |
| 12  | 消息数组无限增长                             | 🟡 中   | `stores/plan.ts`                                     | 加 `MAX_MESSAGES = 100`，超出时 `shift()`                               |
| —   | SSE 竞态条件：多流事件污染                   | 🔴 核心 | `stores/plan.ts`                                     | `generationId` 递增计数器，回调中 `guardGenId()` 检查                   |
| —   | `autoSavePlan` 静默吞错                      | 🟠 高   | `stores/plan.ts`                                     | 加 `.catch()` 设置 `sseError`                                           |
| —   | `itinerary.ts` 硬编码路径                    | 🟡 中   | `client/src/api/itinerary.ts`                        | 改用 `ROUTES.ITINERARIES` 常量                                          |
| —   | `totalCost` 数组越界                         | 🟡 中   | `PlanComparison.vue`                                 | 加 `?.price ?? 0` 保护                                                  |
| —   | SSE Observable 未传播错误                    | 🟡 中   | `ai.controller.ts`                                   | 加 `.catch((err) => subscriber.error(err))`                             |
| —   | PlanComparison 硬编码数据                    | 🟡 中   | `PlanComparison.vue`                                 | 改为 props 驱动，人数从 `store.currentPlan` 取                          |
| —   | `CreateItineraryDto` 缺 `itineraryJson`      | 🔴 核心 | `create-itinerary.dto.ts`, `itinerary.service.ts`    | 补齐字段以使 auto-save 持久化行程 JSON                                  |

## 注意事项

- AI Agent 层（`packages/ai`）需在 NestJS 启动前先构建（`pnpm --filter @trip/ai build`），否则动态 `import` 会失败
- SSE 端点使用 `@Sse()` + `Observable`，NestJS 会自动设置 `Content-Type: text/event-stream`，无需手动处理
- MCP 工具类（TransportTool / AccommodationTool / AmapTool）当前返回预设示例数据，对接真实 API 时需替换 `ai/src/tools/` 下的实现
- `KnowledgeTool.search()` 返回空数组，连接 pgvector 后需实现真实 embedding 检索
- `ROUTES.AI.PLAN` 常量已定义到 `packages/shared`，但 `api/plan.ts` 中的 `subscribePlan` 仍硬编码了 `/ai/plan` 路径（见 TODO 注释），需后续修复
- 方案对比数据当前硬编码在 `PlanComparison.vue` 内，后续应从后端 Itinerary 端点获取真实数据
- `OutlineSidebar.vue` 中 `scrollToDay` 当前仅更新 `activeDay` 状态，未实现真正的滚动联动
- 移动端响应式：Sidebar 使用 `hidden lg:flex` 在 lg 断点以下隐藏，ChatPanel 宽度固定 `w-96`
