---
name: trip-task-decomposer
description: >
  Generate executable task breakdowns from PRD/requirements documents for the 童行AI (Trip with Kids) project.
  Use when the user says "分解任务"、"拆解需求"、"create tasks from PRD"、"分解项目"、"列todo"、
  "implementation plan"、"break down project"、"task breakdown"、"分步实现"、"实施步骤"、
  "怎么开始"、"任务拆分"、"开发计划"、"阶段规划"。
  Make sure to use this skill whenever the user asks to break down project tasks, create implementation steps,
  or plan development phases — even if they don't explicitly mention "task decomposition."
  Designed specifically for Vue 3 + NestJS + LangChain full-stack projects with AI Agent workflows.
---

# 童行AI 项目任务分解器

## 目标

从 PRD 或需求描述中，自动识别项目的模块边界、服务依赖和技术栈模式，输出结构化的可执行任务列表。输出格式与 `writing-plans` 技能兼容，分解后的每个任务可直接由 `writing-plans` 或 `create-implementation-plan` 展开为详细的实现步骤。

## 输入

- `docs/PRD.md` — 产品需求文档（已存在本项目根目录）
- 或对话中用户描述的项目需求

## 输出

保存到 `docs/plans/` 目录的 Markdown 文件，文件名格式：`YYYY-MM-DD-<模块名>-tasks.md`

每个任务条目包含：

| 字段 | 说明 |
|---|---|
| TASK 编号 | `TASK-NNN`，全局唯一 |
| 名称 | 动词开头的简短描述 |
| 阶段 | Phase 0/1/2/3 |
| 层 | 数据库 / 后端 / AI Agent / 前端 / 测试 |
| 模块 | Auth / Trip / Knowledge / Destination / 基础设施 |
| 前置依赖 | 引用其他 `TASK-NNN` |
| 涉及文件 | 完整文件路径，按层分组 |
| 验收标准 | 引用 PRD 用户故事编号（US-N）|
| 复杂度 | S(<2h) / M(2-4h) / L(1-2d) / XL(需拆分) |
| 实现步骤 | Checkbox 列表的原子步骤 |

---

## 项目架构参考

### 技术栈（从 PRD 提取，不可变更）

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Composition API (`<script setup>`) |
| 样式 | Tailwind CSS |
| 后端 | NestJS + TypeScript |
| ORM | Prisma |
| 数据库 | PostgreSQL + pgvector 扩展 |
| AI/LLM | LangChain + LangGraph + DeepAgent |
| 追踪 | LangSmith |

### 后端模块结构（遵循 nestjs-patterns）

```
src/
├── app.module.ts / main.ts
├── common/
│   ├── filters/http-exception.filter.ts
│   ├── guards/jwt-auth.guard.ts
│   ├── interceptors/
│   └── pipes/
├── config/ (configuration.ts, env validation)
├── modules/
│   ├── auth/ (phone + verification code login, JWT)
│   │   ├── auth.module.ts, auth.controller.ts, auth.service.ts
│   │   ├── dto/ (login.dto.ts, verify-code.dto.ts)
│   │   └── strategies/ (jwt.strategy.ts)
│   ├── trip/ (CRUD + AI Agent orchestration)
│   │   ├── trip.module.ts, trip.controller.ts, trip.service.ts
│   │   ├── agents/ (travel-planner.agent.ts, travel-modifier.agent.ts)
│   │   └── sub-agents/ (transport.agent.ts, hotel.agent.ts, attraction.agent.ts, budget.agent.ts)
│   ├── knowledge/ (CRUD + pgvector semantic search)
│   │   ├── knowledge.module.ts, knowledge.controller.ts, knowledge.service.ts
│   │   └── dto/
│   └── destination/ (CRUD)
│       ├── destination.module.ts, destination.controller.ts, destination.service.ts
│       └── dto/
└── prisma/ (schema.prisma, migrations)
```

### 前端页面结构（遵循 vue-best-practices 组件分解模式）

| # | 页面 | 布局 | 核心组件 |
|---|---|---|---|
| P1 | 智能规划工作台 | 三栏布局 | `TripPlannerWorkbench.vue` (容器)、`Timeline.vue`、`DayNode.vue`、`ActivityCard.vue`、`AIChatPanel.vue`、`TripOutline.vue`、`QuickActions.vue` |
| P2 | 亲子知识库 | 三栏布局 | `KnowledgeBase.vue` (容器)、`KnowledgeNav.vue`、`KnowledgeSearch.vue`、`KnowledgeCard.vue`、`KnowledgeDetail.vue` |
| P3 | 目的地库 | 两栏布局 | `DestinationGallery.vue` (容器)、`DestinationFilters.vue`、`DestinationCard.vue` |
| P4 | 我的行程 | 列表布局 | `MyTrips.vue` (容器)、`TripCard.vue`、`TripFilters.vue` |

### AI Agent 工作流（遵循 ai-product 模式）

```
用户输入 → 意图识别 Agent → 路由分发
  ├─ 新行程规划 → TravelPlanner Agent (LangGraph)
  │   ├─ 交通查询 sub-agent（输出含 referencePrice + bookingUrl → 携程/12306）
  │   ├─ 住宿推荐 sub-agent（RAG 检索亲子酒店知识）
  │   ├─ 景点编排 sub-agent（RAG 检索景点/门票/安全知识）
  │   └─ 预算计算 sub-agent
  │   └─ 合并输出结构化行程 JSON
  ├─ 行程修改 → TravelModifier Agent（理解自然语言修改指令）
  └─ 知识问答 → KnowledgeQA Agent（RAG 检索知识库回答）
```

### 数据模型

- **User**: id, phone, nickname, createdAt
- **Trip**: id, userId, destination, days, adults, children, childAge, pace, totalBudget, status
- **DayPlan**: id, tripId, dayNumber, title, description
- **Activity**: id, dayPlanId, type (交通/景点/餐饮/住宿/休息), timeStart, timeEnd, title, description, cost, referencePrice, bookingUrl, knowledgeRefs[]
- **Knowledge**: id, title, summary, content, category, subCategory, ageRange, viewCount, updatedAt
- **Destination**: id, name, englishName, emoji, region, seasons[], ageRanges[], kidScore, knowledgeCount, description

### 模块依赖图

```
         ┌─────────┐
         │  Auth   │ ← 零依赖，Phase 1 首发
         └────┬────┘
              │ (需用户登录)
              ▼
  ┌───────────┼───────────┐
  │           │           │
  ▼           ▼           ▼
┌────────┐ ┌──────────┐ ┌─────────────┐
│  Trip  │ │Knowledge │ │ Destination │
│(AI核心)│ │  (RAG)   │ │  (参考数据)  │
└───┬────┘ └─────┬────┘ └──────┬──────┘
    │            │             │
    └────────────┼─────────────┘
                 ▼
          ┌──────────────┐
          │  前端页面 (P1-P4) │
          └──────────────┘
```

---

## 分解规则

### 规则 1：按模块边界切割

识别 PRD 中的独立模块，每个模块作为一组任务。模块间通过接口/协议耦合，不共享内部实现。

### 规则 2：依赖驱动排序

- 零依赖模块优先（Auth 独立于所有模块）
- **被依赖的模块先实现**（Domain 先于 Application）
- 无交集的模块标注为"可并行"

### 规则 3：不跨层

一个任务不应该跨技术层。示例：
- ❌ "实现用户登录" — 太模糊，混了后端+前端+测试
- ✅ TASK-002: "实现 Auth 后端模块（JWT + 验证码）" — 纯后端
- ✅ TASK-003: "实现登录页面 UI" — 纯前端
- ✅ TASK-004: "编写 Auth E2E 测试" — 纯测试

### 规则 4：粒度控制

| 级别 | 工时 | 典型场景 | 何时拆分 |
|---|---|---|---|
| S | < 2h | 单个组件、单个 API 端点、配置文件修改 | 超过 4h → 拆 S |
| M | 2-4h | 完整 CRUD 接口、一个页面区域、一个 sub-agent | 超过 1d → 拆 M |
| L | 1-2d | 完整后端模块、完整页面、完整 Agent 流程 | 超过 3d → 拆 L |
| XL | 3d+ | 必须进一步拆解为多个 L/M 任务 | — |

### 规则 5：测试伴随

每个功能任务产出对应的测试任务，遵循 `tdd-workflow` 模式：
- 单元测试：组件逻辑、工具函数、service 方法
- 集成测试：API 端点、数据库操作、外部 API 调用
- E2E 测试：完整用户流程

---

## 阶段划分模板

### Phase 0：基础设施
项目脚手架、数据库初始化、CI/CD、环境配置、Prisma Schema 和迁移。

### Phase 1：MVP 核心
PRD 规定的 MVP v0.1 功能：用户认证、AI 行程(生成+修改+时间线)、知识库分类浏览+搜索、目的地库筛选+卡片、我的行程列表。此阶段的任务必须完整覆盖 US-1 到 US-8。

### Phase 2：增强功能
出行清单生成、方案对比、多轮对话优化、知识库内容补充。

### Phase 3：未来功能
行程分享、历史复盘、季节性推荐、用户反馈。

---

## 工作流

### Step 1：加载并解析 PRD

加载 `docs/PRD.md`（从项目根目录），提取：

- **用户故事列表**及其验收标准（US-1 到 US-8）
- **页面结构**（P1-P4 的布局和组件）
- **数据模型**（6 个实体的字段）
- **技术栈**（Vue/NestJS/LangChain/PostgreSQL）
- **AI 工作流**（Agent 拆分和 RAG）
- **非目标**（不实现的功能，标注清楚以免误拆）

### Step 2：识别模块边界

按 PRD 章节识别独立模块，标注类型和依赖：

| 模块 | 层 | 依赖 | 对应 PRD 章节 |
|---|---|---|---|
| Auth | 后端 | 无 | 用户故事 US-1 |
| Trip (含 AI Agent) | 后端 + AI | Auth | US-2, US-3, US-4, US-8 |
| Knowledge | 后端 | Auth | US-5 |
| Destination | 后端 | Auth | US-6 |
| P1 智能规划 | 前端 | Trip API | 页面结构 P1 |
| P2 知识库 | 前端 | Knowledge API | 页面结构 P2 |
| P3 目的地库 | 前端 | Destination API | 页面结构 P3 |
| P4 我的行程 | 前端 | Trip API | 页面结构 P4, US-7 |

### Step 3：按阶段分组

将模块分配到开发阶段：

```
Phase 0: 基础设施
  ├─ 项目脚手架（Vue 3 + NestJS + Prisma + Tailwind）
  ├─ PostgreSQL + pgvector 环境
  ├─ Prisma Schema 定义 + 数据迁移
  ├─ Docker / CI/CD 配置
  └─ LangSmith 集成

Phase 1: MVP 核心
  ├─ Auth 模块（后端 JWT + 验证码 + 前端登录页）
  ├─ Trip 模块（后端 CRUD + 数据模型迁移）
  ├─ AI Agent（LangGraph 工作流 + 4 个 sub-agent）
  ├─ P1 智能规划工作台（三栏布局 + 时间线 + AI 对话）
  ├─ Knowledge 模块（后端 CRUD + pgvector 语义搜索）
  ├─ P2 亲子知识库（导航 + 搜索 + 卡片 + 详情）
  ├─ Destination 模块（后端 CRUD）
  ├─ P3 目的地库（筛选 + 卡片网格）
  ├─ P4 我的行程（状态筛选 + 卡片列表）
  ├─ 外部预订链接集成（携程/12306 搜索页跳转）
  └─ 端到端测试套件

Phase 2: 增强功能
  ├─ 方案对比功能
  ├─ 出行清单生成
  ├─ 多轮对话优化
  └─ 快捷指令按钮完善

Phase 3: 未来
  ├─ 行程分享
  ├─ 历史复盘
  └─ 季节性推荐
```

### Step 4：生成任务清单

对每个模块执行分解：

1. 按技术层切分（DB → 后端 → AI → 前端 → 测试）
2. 确定层内任务粒度（参考粒度控制规则）
3. 标注前置依赖
4. 引用 PRD 用户故事编号作为验收标准

输出模板：

````markdown
### TASK-001: [动词] + [名词]

**阶段**: Phase N
**层**: 数据库 / 后端 / AI Agent / 前端 / 测试
**模块**: Auth / Trip / Knowledge / Destination / 基础设施
**依赖**: TASK-NNN（无依赖填"无"）
**复杂度**: S / M / L / XL
**工时**: X 小时

**涉及文件**:
- 创建: `路径/文件.ts`
- 修改: `路径/文件.ts`
- 测试: `路径/文件.spec.ts`

**验收标准**:
- US-N: [直接从 PRD 复制的验收条件]

**实现步骤**:
- [ ] 1. [原子操作]
- [ ] 2. [原子操作]
````

### Step 5：保存任务分解文档

输出到 `docs/plans/<日期>-<主题>-tasks.md`，文档结构：

```markdown
# [主题] 任务分解

## 概述

## 依赖关系图

## Phase 0: 基础设施
| 任务 | 层 | 复杂度 | 工时 | 依赖 |
|---|---|---|---|---|

### TASK-001: ...

## Phase 1: MVP 核心
| 任务 | 层 | 复杂度 | 工时 | 依赖 |
|---|---|---|---|---|

### TASK-002: ...

## Phase 2: 增强功能 (可选)

## Phase 3: 未来 (待定)
```

---

## 输出示例

以下是基于 `docs/PRD.md` 的 Auth 模块分解示例：

```markdown
### TASK-002: 实现 Auth 后端模块（手机号验证码 + JWT）

**阶段**: Phase 1
**层**: 后端
**模块**: Auth
**依赖**: TASK-001（Prisma Schema）
**复杂度**: M
**工时**: 4h

**涉及文件**:
- 创建: `src/modules/auth/auth.module.ts`
- 创建: `src/modules/auth/auth.controller.ts`
- 创建: `src/modules/auth/auth.service.ts`
- 创建: `src/modules/auth/dto/login.dto.ts`
- 创建: `src/modules/auth/dto/verify-code.dto.ts`
- 创建: `src/modules/auth/strategies/jwt.strategy.ts`
- 创建: `src/modules/auth/guards/jwt-auth.guard.ts`
- 修改: `src/app.module.ts`

**验收标准**:
- US-1: 手机号 + 验证码可登录并返回 JWT
- US-1: Demo 快速填充按钮生成测试用户

---

### TASK-003: 实现登录页面 UI

**阶段**: Phase 1
**层**: 前端
**模块**: Auth
**依赖**: TASK-002（Auth API）
**复杂度**: S
**工时**: 2h

**涉及文件**:
- 创建: `src/pages/auth/LoginPage.vue`
- 创建: `src/components/auth/PhoneInput.vue`
- 创建: `src/components/auth/CodeInput.vue`
- 创建: `src/composables/useAuth.ts`

**验收标准**:
- US-1: 手机号输入 → 获取验证码 → 登录流程完整
- US-1: Demo 快速填充按钮可用
```

---

## 集成与协作

### 与 writing-plans 技能协作

`trip-task-decomposer` 负责**阶段级分解**（识别模块、分配阶段、确定依赖），输出结果可以直接作为 `writing-plans` 的输入，由 `writing-plans` 对每个任务进行**步骤级细化**（包含代码、测试、命令）。

```
用户: "分解这个项目的任务"
  → trip-task-decomposer: 输出阶段任务列表 + 依赖图
  → docs/plans/2026-07-08-trip-tasks.md

用户: "展开 Auth 模块的详细计划"
  → writing-plans: 将 TASK-002/TASK-003 细化为带代码的步骤
  → docs/superpowers/plans/2026-07-08-auth-module.md
```

### 与 create-implementation-plan 协作

当需要机器可执行的严格计划时，可直接引用 `create-implementation-plan` 的 ID 体系（`REQ-NNN`、`FILE-NNN`、`TEST-NNN`）来替代简单的编号。

### 与 tdd-workflow 协作

分解时自动在测试层生成任务，遵循 TDD 流程：
1. 编写测试（失败）
2. 实现功能
3. 验证测试通过
4. 重构

---

## 自检清单

完成任务分解后，检查以下内容：

- [ ] 每个 PRD 用户故事（US-1 到 US-8）都有对应的实现任务
- [ ] 每个模块的依赖关系正确（无循环依赖）
- [ ] 没有任务跨越技术层
- [ ] 没有 XL 任务（所有 XL 都已拆分）
- [ ] 每个任务都有验收标准引用自 PRD
- [ ] 所有涉及文件路径都准确
- [ ] 测试任务覆盖了每个功能模块
- [ ] 非目标功能被明确标注为"不实现"
