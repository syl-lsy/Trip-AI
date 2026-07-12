---
title: AI 层架构
date: 2026-07-09
status: draft
type: architecture
author: docs-writer
version: 1.0
---

# AI 层架构

> 本文档描述 童行 AI（Trip with Kids）项目的 AI Agent 层技术架构，包括模块划分、数据流、状态定义和 MCP 集成。

## 一、整体架构

```
┌─────────────────────────────────────────────────────┐
│                   接入层 (NestJS)                     │
│  POST /api/ai/chat │ POST /api/ai/plan │ POST /api/ai/modify │
└──────────────────────┬──────────────────────────────┘
                       │ SSE Stream
                       ▼
┌─────────────────────────────────────────────────────┐
│                  编排层 (AI Core)                     │
│                                                       │
│  ┌──────────────┐  意图分类  ┌──────────────────┐    │
│  │ IntentRouter │ ────────→  │  plan / modify /  │    │
│  │ (deepAgent)  │           │  qa               │    │
│  └──────────────┘           └────────┬─────────┘    │
│                                      │               │
│           ┌──────────────────────────┼──────────┐    │
│           ▼                          ▼          ▼    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │
│  │ TravelPlanner│  │TravelModifier│  │Knowledge │   │
│  │ (StateGraph) │  │ (deepAgent)  │  │   QA     │   │
│  └──────┬───────┘  └──────────────┘  │ (deepAgent)│  │
│         │                            └──────────┘   │
│    ┌────┼────┐                                       │
│    ▼    ▼    ▼                                       │
│ 子 Agent (deepAgent)                                  │
│  Tr  Acc  Att  Bud                                    │
└──────┬──────────────────────────────────────────────┘
       │ MCP Client
       ▼
┌─────────────────────────────────────────────────────┐
│                  能力层 (MCP Tools)                   │
│                                                       │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │
│  │ 飞常准 MCP │  │ 12306 MCP  │  │ 高德地图 MCP │   │
│  │ (航班查询) │  │ (火车查询) │  │ (路线/POI)   │   │
│  └────────────┘  └────────────┘  └──────────────┘   │
│                                                       │
│  ┌──────────────────┐  ┌──────────────────┐          │
│  │ pgvector RAG     │  │ Prisma Database  │          │
│  │ (知识库向量检索) │  │ (用户/行程数据)  │          │
│  └──────────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────────┘
```

## 二、Agent 模块说明

### 2.1 IntentRouter

| 属性 | 说明 |
|------|------|
| **类型** | deepAgent (`createDeepAgent`) |
| **模型** | `LLM_CONFIG.fast`（低延迟模型） |
| **输入** | 用户消息 + 当前行程上下文 |
| **输出** | `{ intent, confidence, entities }` |
| **延迟目标** | < 500ms |
| **缓存** | Redis `intent:{message_hash}` TTL 1h |

### 2.2 TravelPlanner

| 属性 | 说明 |
|------|------|
| **类型** | LangGraph `StateGraph`（编排）+ deepAgent（子 Agent） |
| **模型** | `LLM_CONFIG.strong`（子 Agent） |
| **子 Agent** | TransportAgent, AccommodationAgent, AttractionAgent, BudgetAgent |
| **执行模式** | Step 1 并行 → Step 2 串行 → Step 3 串行 |
| **最大步数** | 15 |
| **超时** | 120s |

#### 子 Agent 依赖关系

```
TransportAgent (并行)     AccommodationAgent (并行)
         │                        │
         └──────────┬─────────────┘
                    ▼
           AttractionAgent (串行，依赖交通和住宿结果)
                    │
                    ▼
              BudgetAgent (最后执行，汇总所有费用)
```

### 2.3 TravelModifier

| 属性 | 说明 |
|------|------|
| **类型** | deepAgent (`createDeepAgent`) |
| **模型** | `LLM_CONFIG.strong` |
| **输入** | 当前行程 JSON + 用户自然语言修改指令 |
| **输出** | 修改后的完整行程 JSON |
| **方式** | 全量重新生成（非增量 patch），保证一致性 |

### 2.4 KnowledgeQA

| 属性 | 说明 |
|------|------|
| **类型** | deepAgent (`createDeepAgent`) |
| **模型** | `LLM_CONFIG.fast` |
| **检索方式** | pgvector hybrid（语义 cosine + BM25 关键词） |
| **Embedding** | 1536 维 |
| **Top-K** | 5 |
| **缓存** | Redis `qa:{question_hash}:top5` TTL 24h |
| **引用格式** | `📖 [来源标题](知识详情页 URL)` |

## 三、数据流

### 3.1 行程规划数据流

```
用户: "三亚5天4晚，2大1小，孩子3岁，预算1万"
  │
  ▼
IntentRouter
  ├─ 调用 LLM 分类
  ├─ 缓存结果到 Redis
  └─ 返回 { intent: "plan", confidence: 0.95, entities: { destination: "三亚" } }
  │
  ▼
TravelPlanner StateGraph
  │
  ├─ Node: TransportAgent (并行)
  │   ├─ 飞常准 MCP → searchFlight(出发地→三亚)
  │   ├─ 12306 MCP → searchTrain(出发地→三亚)
  │   └─ 高德地图 MCP → planRoute(出发地→三亚)
  │
  ├─ Node: AccommodationAgent (并行)
  │   └─ 查询预设住宿数据（MVP 阶段）
  │
  ├─ Node: AttractionAgent (串行，等待交通+住宿完成)
  │   ├─ 高德地图 MCP → searchPOI(三亚, 亲子)
  │   └─ KnowledgeQA → 查询亲子评分
  │
  └─ Node: BudgetAgent (串行)
      └─ 汇总交通+住宿+景点费用
  │
  ▼
返回完整行程 JSON → SSE 流式推送到前端
```

### 3.2 知识问答数据流

```
用户: "3岁小孩坐飞机需要注意什么？"
  │
  ▼
IntentRouter → { intent: "qa" }
  │
  ▼
KnowledgeQA
  ├─ Redis 缓存命中 → 直接返回缓存结果
  ├─ embedding 用户问题 → pgvector cosine_search(k=5)
  ├─ BM25 关键词搜索(k=5)
  ├─ 融合排序 → top 5
  ├─ 拼接上下文 → 调用 LLM 生成
  └─ 返回带来源引用的回答
```

## 四、状态定义

### 4.1 TravelPlannerState

```typescript
interface TravelPlannerState {
  // 用户需求
  userRequirements: UserRequirements;

  // 子 Agent 结果
  transport: TransportOption[];
  accommodation: AccommodationOption[];
  attractions: AttractionOption[];
  budget: BudgetSummary | null;

  // 执行状态
  progress: ProgressEvent[];
  errors: AgentError[];
  completedAt: string | null;
}

interface UserRequirements {
  destination: string;
  origin?: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  childAge: number;
  pace: "relaxed" | "moderate" | "intense";
  budget: number;
}

interface TransportOption {
  type: "flight" | "train" | "driving";
  from: string;
  to: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  childFriendly: boolean;
  notes: string[];
  source: string;       // 数据来源：variflight | train12306 | amap
}

interface AccommodationOption {
  name: string;
  type: "hotel" | "homestay";
  location: string;
  checkIn: string;
  checkOut: string;
  pricePerNight: number;
  kidFriendly: number;  // 0-10
}

interface AttractionOption {
  name: string;
  category: string;
  duration: string;     // 建议游玩时长
  price: number;
  kidFriendly: number;  // 0-10
  notes: string[];
}

interface BudgetSummary {
  total: number;
  breakdown: {
    transport: number;
    accommodation: number;
    attractions: number;
    dining: number;
    other: number;
  };
  originalBudget: number;
  remaining: number;
}

interface ProgressEvent {
  step: string;
  status: "running" | "completed" | "failed";
  message: string;
  timestamp: string;
}

interface AgentError {
  node: string;
  code: string;
  message: string;
  recoverable: boolean;
}
```

### 4.2 IntentRouter 输出

```typescript
interface IntentResult {
  intent: "plan" | "modify" | "qa";
  confidence: number;       // 0.0 - 1.0
  entities?: {
    destination?: string;
    origin?: string;
    days?: number;
    budget?: number;
    adults?: number;
    children?: number;
    childAge?: number;
  };
}
```

### 4.3 KnowledgeQA 输出

```typescript
interface KnowledgeQAResult {
  answer: string;
  references: Array<{
    title: string;
    url: string;
    category: string;
    similarity: number;
  }>;
  confidence: "high" | "medium" | "low";
}
```

## 五、MCP 集成架构

### 5.1 MCP 服务总览

| 服务名 | 提供商 | 用途 | 传输方式 | 认证方式 |
|--------|--------|------|---------|---------|
| `variflight` | 飞常准 | 航班查询、准点率、舒适度 | stdio | 无需（API Key 内置） |
| `train12306` | 12306 | 火车票查询、余票、价格 | streamable_http | 无需 |
| `amap` | 高德地图 | 路线规划、POI 搜索、天气 | streamable_http | API Key |

### 5.2 MCP 调用流程

```typescript
// 1. 初始化 MCP 客户端
const client = new MultiServerMCPClient(config);

// 2. 获取工具
const tools = await client.getTools();

// 3. 传入 deepAgent
const agent = await createDeepAgent({ model, tools });

// 4. Agent 在运行时自动调用 MCP 工具
const result = await agent.invoke({ messages: [...] });
```

### 5.3 MCP 配置注册

MCP 服务地址和密钥通过 `ai/config/mcp.ts` + `.env` 管理，不在代码中硬编码。

```env
# .env (AI 层)
VARIFLIGHT_MCP_PACKAGE=@variflight/variflight-mcp
TRAIN12306_MCP_URL=https://your-12306-mcp-server/mcp
AMAP_MCP_URL=https://lbs.amap.com/api/mcp-server
AMAP_API_KEY=your_amap_api_key
```

## 六、技能调用流程

所有 AI 层开发工作必须按以下流程调用对应的技能：

```
[收到开发任务]
    │
    ▼
{skill:prompt-engineering-patterns}
    生成/优化 prompt 文件 → ai/prompts/
    │
    ▼
{skill:context-engineering}
    构建 Agent 的分层上下文
    │
    ▼
{skill:harness-engineering}
    记录失败模式 → ai/docs/failures/
    │
    ▼
{skill:deep-agents}
    createDeepAgent 实现
    │
    ▼
{skill:langgraph}
    StateGraph 编排
    │
    ▼
{skill:rag-engineer} / {skill:pgvector-semantic-search}
    RAG / 向量检索实现
    │
    ▼
{skill:verification-before-completion}
    完稿前验证
```

---

> **变更记录**
>
> | 版本 | 日期 | 变更内容 |
> |------|------|---------|
> | 1.0 | 2026-07-09 | 初稿 |
