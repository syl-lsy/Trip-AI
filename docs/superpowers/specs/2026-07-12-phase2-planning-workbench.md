---
title: Phase 2 — 智能规划工作台
date: 2026-07-12
status: draft
type: spec
author: docs-writer
version: 1.0
---

# Phase 2 — 智能规划工作台 设计文档

## 1. 概述

Phase 2 实现产品的核心功能——智能规划工作台。用户通过自然语言对话描述出行需求，AI Agent 自动生成完整亲子行程，并支持可视化预览、自然语言修改和知识库联动。

### 范围

| 模块             | 说明                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| **前端三栏布局** | 左侧行程大纲 + 中间时间线可视化 + 右侧 AI 对话面板                     |
| **后端 API**     | Itinerary CRUD + AI 端点（chat/plan/modify，SSE 流式）                 |
| **AI Agent 层**  | IntentRouter + TravelPlanner(含子Agent) + TravelModifier + KnowledgeQA |

### 非范围

- 实时外部 API 集成（飞常准/12306/高德/住宿 MCP 仅封装接口层，实际凭据后续配置）
- 支付/交易/票务
- 社区/UGC
- 移动端原生 App

## 2. 架构

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
                  │ MCP Clients (ai/src/tools/)                        │          │
                  │  ├─ 飞常准 (flights)     ├─ 12306 (trains)          │          │
                  │  ├─ 高德地图 (routes+POI) ├─ 住宿 MCP                │          │
                  │  └─ pgvector RAG (knowledge)                        │          │
                  └─────────────────────────────────────────────────────┘
```

### 2.1 数据流

**行程规划流程：**

```
用户输入 → IntentRouter → { intent: "plan" }
  → TravelPlanner
      ├─ TransportAgent (并行) → 飞常准/12306/高德
      ├─ AccommodationAgent (并行) → 住宿 MCP
      ├─ AttractionAgent (串行) → 高德 POI
      └─ BudgetAgent (串行) → 汇总
  → SSE 流式推送进度 + 行程 JSON
  → 前端解析渲染时间线
```

**SSE 事件协议：**

```typescript
interface SSEEvent {
  type:
    | 'progress' // 进度更新 { step: number, status: string, message: string }
    | 'message' // AI 文本消息 { content: string }
    | 'plan' // 行程 JSON { plan: TripPlan }
    | 'knowledge_ref' // 知识引用 { id: string, title: string }
    | 'error' // 错误 { message: string }
  data: any
}
```

## 3. 数据模型

### 3.1 共享类型 (packages/shared/src/api/types.ts)

```typescript
interface ItineraryNode {
  type: 'transport' | 'accommodation' | 'attraction' | 'dining' | 'rest'
  day: number
  time: string
  title: string
  cost: number
  childFriendly: boolean
  notes: string[]
  knowledgeRefs: string[]
}

interface DayPlan {
  day: number
  date: string
  paceDescription: string
  nodes: ItineraryNode[]
}

interface TripPlan {
  title: string
  destination: string
  members: { adults: number; children: number; childAge: number }
  days: DayPlan[]
  budget: BudgetSummary
  kidFriendlyScore: number
}

interface BudgetSummary {
  total: number
  breakdown: {
    transport: number
    accommodation: number
    attractions: number
    dining: number
    other: number
  }
  originalBudget: number
  remaining: number
}
```

### 3.2 Prisma 模型变更

`Itinerary` 表新增 `chatHistory` 字段（可选，Json?）。

## 4. 5 个垂直切片

### 切片 1: 基础三栏布局 + AI 对话面板

| 组件               | 说明                                         |
| ------------------ | -------------------------------------------- |
| PlanView.vue       | 三栏容器，responsive 断点                    |
| OutlineSidebar.vue | 左栏行程大纲（空状态 + 快捷标签）            |
| TimelineCenter.vue | 中间区域（空状态占位）                       |
| ChatPanel.vue      | 右栏 AI 对话（欢迎消息 + 消息列表 + 输入区） |
| plan store (Pinia) | 对话状态 + 当前行程状态                      |
| plan API           | `/api/ai/chat` 非流式端点                    |

### 切片 2: Itinerary CRUD + AI Plan + SSE

| 组件                 | 说明                                                             |
| -------------------- | ---------------------------------------------------------------- |
| ai/ 包               | 全量 AI Agent 层 (IntentRouter + TravelPlanner + TravelModifier) |
| MCP 工具封装         | 飞常准/12306/高德/住宿 MCP 客户端接口                            |
| Itinerary Controller | CRUD REST 端点                                                   |
| AI Controller        | `/api/ai/plan`, `/api/ai/chat`, `/api/ai/modify` SSE 端点        |
| ProgressSkeleton.vue | 5 步进度指示器                                                   |
| SSE 订阅逻辑         | plan store 中实现                                                |

### 切片 3: 行程可视化

| 组件               | 说明                                          |
| ------------------ | --------------------------------------------- |
| TimelineCenter.vue | 完整实现：总览条 + 图例 + 每日时间线          |
| DayCard.vue        | 每日卡片（日期、节奏、彩色边框）              |
| TimelineNode.vue   | 单个节点（时间、Emoji、标题、费用、知识标签） |
| OutlineSidebar.vue | 按天导航，点击滚动                            |
| EmptyState.vue     | 空状态组件                                    |

### 切片 4: TravelModifier + KnowledgeQA

| 组件                 | 说明                         |
| -------------------- | ---------------------------- |
| KnowledgeQA Agent    | pgvector RAG 检索 + LLM 回答 |
| KnowledgeRefCard.vue | 知识引用卡片组件             |
| QuickActions.vue     | 快捷指令按钮组               |
| knowledge API        | `/api/knowledge/search`      |

### 切片 5: 方案对比弹窗

| 组件               | 说明                            |
| ------------------ | ------------------------------- |
| PlanComparison.vue | 弹窗：多出发路径对比 + 费用计算 |

## 5. API 端点

| 端点                   | 方法     | 说明                         | 切片      |
| ---------------------- | -------- | ---------------------------- | --------- |
| `/api/itineraries`     | GET      | 行程列表 (prisma 已存在模型) | 2         |
| `/api/itineraries`     | POST     | 新建行程                     | 2         |
| `/api/itineraries/:id` | GET      | 行程详情                     | 2         |
| `/api/itineraries/:id` | PUT      | 更新行程                     | 2         |
| `/api/itineraries/:id` | DELETE   | 删除行程                     | 2         |
| `/api/ai/chat`         | POST SSE | AI 对话                      | 1(简化)/2 |
| `/api/ai/plan`         | POST SSE | 生成新行程                   | 2         |
| `/api/ai/modify`       | POST SSE | 修改行程                     | 4         |

## 6. AI Agent 层设计

### 6.1 IntentRouter

| 属性 | 说明                         |
| ---- | ---------------------------- |
| 输入 | 用户消息 + 当前行程上下文    |
| 输出 | `{ intent: "plan"            | "modify" | "qa", confidence, entities }` |
| 实现 | LLM + few-shot prompt 分类   |
| 缓存 | Redis `intent:{hash}` TTL 1h |

### 6.2 TravelPlanner

| 属性     | 说明                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 编排     | LangGraph StateGraph                                                    |
| 子 Agent | Transport(并行) → Accommodation(并行) → Attraction(串行) → Budget(串行) |
| 数据源   | 飞常准(航班) + 12306(火车) + 高德(POI+路线) + 住宿MCP + pgvector RAG    |
| 降级     | 真实 API 不可用时使用预设示例数据                                       |

### 6.3 TravelModifier

| 属性 | 说明                         |
| ---- | ---------------------------- |
| 输入 | 当前行程 JSON + NL 修改指令  |
| 输出 | 修改后完整行程 JSON          |
| 实现 | LLM 全量重生成 + Budget 重算 |

### 6.4 KnowledgeQA

| 属性     | 说明                             |
| -------- | -------------------------------- |
| 检索     | pgvector hybrid (cosine + BM25)  |
| Top-K    | 5                                |
| 缓存     | Redis `qa:{hash}:top5` TTL 24h   |
| 引用格式 | 📖 [标题] · 来源：童行亲子知识库 |

## 7. 风险

| 风险                | 缓解                          |
| ------------------- | ----------------------------- |
| LLM JSON 输出不稳定 | 重试 2 次 + fallback 原始文本 |
| SSE 延迟            | 子 Agent 并行 + 骨架屏先行    |
| MCP API 不可用      | try-catch 降级到预设数据      |
| Token 成本          | Redis 缓存 intent + RAG 结果  |
