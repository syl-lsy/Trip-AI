# Phase 2 智能规划工作台 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 实现智能规划工作台核心功能——三栏布局、AI 行程生成、可视化渲染、自然语言修改、知识库联动

**Architecture:** Vue 3 前端三栏布局 + NestJS 后端 API (REST + SSE) + LangChain AI Agent 层。5 个垂直切片递进交付，每切片可独立测试。

**Tech Stack:** Vue 3 Composition API + Pinia + Tailwind CSS + NestJS + Prisma + LangChain + pgvector

## Global Constraints

- 所有 AI 文本使用中文
- 行程 JSON 结构作为共享类型定义在 `packages/shared/src/api/types.ts`
- 后端 API 统一响应 `{ success: boolean, data?: T, error?: string }`
- SSE 流式使用 NestJS `@Sse()` 装饰器
- AI 层 `ai/` 使用 LangChain + tsx 开发，输出 CJS 供 NestJS 调用

---

### Task 1: 基础三栏布局 + AI 对话面板

**Files:**

- Create: `client/src/components/plan/ChatPanel.vue`
- Create: `client/src/components/plan/OutlineSidebar.vue`
- Create: `client/src/components/plan/TimelineCenter.vue`
- Create: `client/src/stores/plan.ts`
- Create: `client/src/api/plan.ts`
- Modify: `client/src/views/PlanView.vue` (重写)

**Interfaces:**

- Consumes: 无（这是基础切片）
- Produces: `ChatPanel` props/emit、`usePlanStore` store、`planApi`

- [ ] **Step 1: Create `plan.ts` store**

```typescript
// client/src/stores/plan.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  knowledgeRefs?: { id: string; title: string }[]
}

export const usePlanStore = defineStore('plan', () => {
  const currentPlan = ref<TripPlan | null>(null)
  const messages = ref<ChatMessage[]>([])
  const showWelcome = ref(true)
  const isLoading = ref(false)

  function addMessage(msg: ChatMessage) {
    messages.value.push(msg)
    showWelcome.value = false
  }

  return { currentPlan, messages, showWelcome, isLoading, addMessage }
})
```

- [ ] **Step 2: Create `plan.ts` API layer**

```typescript
// client/src/api/plan.ts
import { client } from './client'

export const planApi = {
  async chat(message: string) {
    const res = await client.post('/api/ai/chat', { message })
    return res.data
  },
}
```

- [ ] **Step 3: Create `ChatPanel.vue`**

- 右栏 384px，白色背景，左侧 1px 分隔线
- 头部：AI 头像 + "童行规划师" + 绿色"在线"标识
- 消息列表：用户消息右对齐（蓝色气泡），AI 消息左对齐（灰色气泡）
- 欢迎状态：显示 AI 欢迎消息 + 4 个快捷指令按钮
- 输入区：textarea + 发送按钮，Enter 发送，Shift+Enter 换行

- [ ] **Step 4: Create `OutlineSidebar.vue`**

- 左侧 240px
- 空状态时显示"暂无行程，开始规划吧"
- 有行程时按天显示导航（后续切片实现）

- [ ] **Step 5: Create `TimelineCenter.vue`**

- 中间 `flex-1`
- 空状态：地图图标 + "开始规划你的亲子之旅" + 快捷示例标签（"去三亚5天"、"去云南6天"等）
- 点击标签自动打开 ChatPanel 并发送预设消息

- [ ] **Step 6: Rewrite `PlanView.vue`**

- 三栏容器 `flex`
- 桌面端三栏同时显示
- 移动端 (< 1024px) 侧栏隐藏，通过按钮弹出
- 注册 `usePlanStore`

---

### Task 2: 后端 Itinerary CRUD + AI Plan + SSE 流式

**Files:**

- Create: `server/src/ai/ai.module.ts`
- Create: `server/src/ai/ai.controller.ts`
- Create: `server/src/ai/ai.service.ts`
- Create: `server/src/itinerary/itinerary.controller.ts`
- Create: `server/src/itinerary/itinerary.service.ts`
- Create: `server/src/itinerary/dto/create-itinerary.dto.ts`
- Create: `server/src/itinerary/dto/update-itinerary.dto.ts`
- Create: `server/src/itinerary/itinerary.module.ts` (补全)
- Create: `ai/package.json`
- Create: `ai/tsconfig.json`
- Create: `ai/src/index.ts`
- Create: `ai/src/config/llm.ts`
- Create: `ai/src/config/prompts.ts`
- Create: `ai/src/intent-router/router.ts`
- Create: `ai/src/agents/travel-planner.ts`
- Create: `ai/src/agents/travel-modifier.ts`
- Create: `ai/src/tools/transport.ts`
- Create: `ai/src/tools/accommodation.ts`
- Create: `ai/src/tools/amap.ts`
- Create: `ai/src/types.ts`
- Create: `client/src/components/plan/ProgressSkeleton.vue`
- Modify: `client/src/stores/plan.ts`
- Modify: `client/src/api/plan.ts`

**Interfaces:**

- Consumes: 切片 1 (plan store, ChatPanel)
- Produces: AI Agent 工厂函数、Itinerary REST API、SSE 端点

- [ ] **Step 1: 初始化 `ai/` 包**

`ai/package.json` — esbuild/tsx 构建，依赖 `@langchain/core`, `@langchain/langgraph`, `openai`

```json
{
  "name": "@trip/ai",
  "type": "module",
  "main": "./src/index.ts",
  "dependencies": {
    "@langchain/core": "^0.3",
    "@langchain/langgraph": "^0.2",
    "openai": "^4"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: AI 层类型定义 (`ai/src/types.ts`)**

```typescript
interface UserRequirements {
  destination: string
  origin?: string
  startDate: string
  endDate: string
  adults: number
  children: number
  childAge: number
  pace: 'relaxed' | 'moderate' | 'intense'
  budget: number
}
interface IntentResult {
  intent: 'plan' | 'modify' | 'qa'
  confidence: number
  entities?: Partial<UserRequirements>
}
```

- [ ] **Step 3: IntentRouter (`ai/src/intent-router/router.ts`)**

- LLM + few-shot prompt 分类
- 输入：用户消息 → 输出 `IntentResult`
- 返回 plan/modify/qa

- [ ] **Step 4: TravelPlanner (`ai/src/agents/travel-planner.ts`)**

- 使用 LangGraph StateGraph 编排 4 个子 Agent
- 数据来源：transport(飞常准+12306) + accommodation(住宿 MCP) + amap(路线+POI)
- 降级逻辑：API 不可用时使用预设数据
- 输出完整 `TripPlan` JSON

- [ ] **Step 5: MCP 工具封装 (`ai/src/tools/`)**

- `transport.ts`: 飞常准/12306 MCP 客户端 stubs（返回预设数据 + 真实 API 调用框架）
- `accommodation.ts`: 住宿 MCP 客户端 stub
- `amap.ts`: 高德地图客户端 stub（路线规划 + POI 搜索）

- [ ] **Step 6: NestJS 后端 Itinerary CRUD**

- `itinerary.controller.ts`：GET/POST/PUT/DELETE `/api/itineraries`
- `itinerary.service.ts`：Prisma CRUD
- 注册到 `app.module.ts`

- [ ] **Step 7: NestJS AI 模块 + SSE**

- `ai.controller.ts`: `POST /api/ai/chat`、`POST /api/ai/plan`、`POST /api/ai/modify`
- `ai.service.ts`: 调用 AI Agent 层，返回 SSE 流
- SSE 事件类型: `progress` / `message` / `plan` / `error`

- [ ] **Step 8: `ProgressSkeleton.vue`**

5 步进度组件：

```
Step 1: ✅ 已读取出行需求
Step 2: ✅ 已查询交通信息
Step 3: 🔄 正在比价航班方案…
Step 4: ⭕ 检索景点与酒店
Step 5: ⭕ 生成每日行程
```

- [ ] **Step 9: 前端 SSE 订阅**

`plan store` 中添加 SSE 订阅逻辑，接收 `type: 'plan'` 事件后更新 `currentPlan`

---

### Task 3: 行程可视化渲染 + 时间线

**Files:**

- Create: `client/src/components/plan/DayCard.vue`
- Create: `client/src/components/plan/TimelineNode.vue`
- Create: `client/src/components/plan/EmptyState.vue`
- Modify: `client/src/components/plan/TimelineCenter.vue` (实现)
- Modify: `client/src/components/plan/OutlineSidebar.vue` (实现)

**Interfaces:**

- Consumes: `currentPlan: TripPlan` (from plan store)
- Produces: 可视化行程渲染

- [ ] **Step 1: `DayCard.vue`**

- 白底、`rounded-xl`、`shadow-card`、左侧 4px `border-l-{color}`
- 头部：Day N · 日期 + 节奏说明 + 编辑按钮
- 子节点列表：`TimelineNode` 列表

- [ ] **Step 2: `TimelineNode.vue`**

- 左侧 18px 虚线竖线 + Emoji 图标
- 类型颜色映射：🚗 交通→primary / 🏔️ 景点→success / 🍽️ 餐饮→accent / 🏨 住宿→danger / 😴 休息→gray
- 费用标注 + 知识标签（可点击）

- [ ] **Step 3: `EmptyState.vue`**

- 地图图标 + 提示文本 + 快捷标签按钮

- [ ] **Step 4: 实现 `TimelineCenter.vue`**

- 总览条：目的地、亲子友好度评分(⭐8.5)、总预算(¥8000)、导出PDF按钮
- 节点类型图例
- 有行程时渲染 DayCard
- 无行程时渲染 EmptyState

- [ ] **Step 5: 实现 `OutlineSidebar.vue`**

- 有行程时：显示行程名称 → 成员信息 → 按天列表
- 当前日高亮 (`bg-primary/10`)
- 底部工具按钮："方案对比"、"导出行程"、"出行清单"

---

### Task 4: TravelModifier + KnowledgeQA + 知识引用

**Files:**

- Create: `ai/src/agents/knowledge-qa.ts`
- Create: `ai/src/tools/knowledge.ts`
- Create: `client/src/components/plan/KnowledgeRefCard.vue`
- Create: `client/src/components/plan/QuickActions.vue`
- Modify: `ai/src/index.ts` (注册新 Agent)

**Interfaces:**

- Consumes: TripPlan (修改)、pgvector 知识库 (问答)
- Produces: 修改后行程、知识引用卡片

- [ ] **Step 1: `knowledge-qa.ts`**

- 接收问题 → pgvector hybrid 检索(cosine + BM25) → LLM 生成回答 → 返回带引用的结果

- [ ] **Step 2: `knowledge.ts` (工具)**

- pgvector 查询工具：`searchKnowledge(query, topK=5)`
- 使用 Prisma 的 `$queryRawUnsafe` 执行 vector 查询

- [ ] **Step 3: `KnowledgeRefCard.vue`**

- 📖 图标 + 标题 + "来源：童行亲子知识库"
- 点击跳转 `/knowledge/:id`

- [ ] **Step 4: `QuickActions.vue`**

- 快捷指令按钮组："放慢节奏"、"更换酒店"、"压缩预算"、"增加美食"
- 点击后自动填充到 ChatPanel 输入区并发送

---

### Task 5: 方案对比弹窗

**Files:**

- Create: `client/src/components/plan/PlanComparison.vue`

- [ ] **Step 1: `PlanComparison.vue`**

- 弹窗展示多出发路径（如"上海虹桥出发" vs "无锡硕放出发"）
- 高铁选择 + 航班选择 + 三人交通合计费用实时计算
- 推荐方案高亮（`border-primary/30 bg-primary/5` + "⭐ 推荐"）
- "应用此方案"按钮更新行程交通节点
