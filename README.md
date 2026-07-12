# 童行 AI（Trip with Kids）

**AI 驱动的亲子旅游一站式规划平台**

带娃出行太折腾？童行 AI 帮你搞定一切。输入需求，AI 自动生成适合孩子年龄的完整行程，支持自然语言修改，知识库实时联动，让亲子旅行省心又安心。

---

## 技术栈

| 层 | 技术 | 目录 |
|----|------|------|
| 前端 | Vue 3 (Composition API) + TypeScript + Tailwind CSS + Vite | `client/` |
| 后端 | NestJS + Prisma + PostgreSQL + pgvector + Redis | `server/` |
| AI | LangChain + LangGraph + DeepAgent | `ai/` |
| 认证 | JWT + 手机验证码 | 无状态认证 |
| 向量检索 | pgvector（1536 维嵌入） | PostgreSQL 扩展 |

---

## 项目结构

```
trip-planner/
├── client/             # Vue 3 前端
│   └── src/
│       ├── views/      # 页面组件（登录/规划/知识库/目的地/行程）
│       ├── components/ # 通用组件
│       ├── stores/     # Pinia 状态管理
│       └── router/     # Vue Router 路由配置
├── server/             # NestJS 后端
│   └── src/
│       ├── auth/       # 认证模块（JWT + 验证码）
│       ├── itinerary/  # 行程模块（CRUD）
│       ├── knowledge/  # 知识库模块（RAG 检索）
│       └── destination/# 目的地模块
├── ai/                 # AI Agent 层
│   └── agents/
│       ├── router/     # IntentRouter 意图分类
│       ├── planner/    # TravelPlanner 行程规划
│       ├── modifier/   # TravelModifier 行程修改
│       └── qa/         # KnowledgeQA 知识问答
├── docs/               # 项目文档
│   ├── PRD.md          # 产品需求文档
│   ├── agent-workflow.md  # Agent 工作流
│   └── api/openapi.json  # OpenAPI 规范（导入 Apifox）
├── scripts/            # 工具脚本
└── .opencode/          # OpenCode 配置
```

---

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 14（含 pgvector 扩展）
- Redis >= 7

### 安装

```bash
# 安装所有依赖
pnpm install

# 初始化数据库
pnpm --filter server run prisma:migrate --name init

# 填充示例数据
pnpm --filter server run prisma:seed
```

### 启动开发服务器

```bash
# 同时启动三端
pnpm dev

# 或分别启动
pnpm --filter client run dev      # 前端 → http://localhost:5173
pnpm --filter server run dev      # 后端 → http://localhost:3000
pnpm --filter ai run dev          # AI Agent
```

### 运行测试

```bash
# 前端测试
pnpm --filter client run test
pnpm --filter client run test:coverage

# 后端测试
pnpm --filter server run test
pnpm --filter server run test:coverage

# AI 测试
pnpm --filter ai run test
```

---

## AI Agent 架构

```
用户输入
   ↓
IntentRouter（LLM 意图分类）
   ├─ plan    → TravelPlanner
   │              ├─ TransportAgent（交通方案）
   │              ├─ AccommodationAgent（住宿方案）
   │              ├─ AttractionAgent（景点方案）
   │              └─ BudgetAgent（预算规划）
   ├─ modify  → TravelModifier（自然语言修改）
   └─ qa      → KnowledgeQA（pgvector RAG 知识问答）
```

- **IntentRouter**：few-shot prompt 将用户意图分类为 plan / modify / qa
- **TravelPlanner**：LangGraph 多步骤工作流，子 Agent 可并行执行
- **TravelModifier**：解析修改指令 → 定位节点 → 重新生成
- **KnowledgeQA**：混合检索（语义 + 关键词）→ 重排序 → 带来源引用的回答

---

## 设计规范

| Token | 值 | 用途 |
|-------|-----|------|
| 主色 primary | `#4A90D9` | 按钮、链接、品牌色 |
| 强调色 accent | `#F5A623` | 预算金额、评分 |
| 成功色 success | `#7EB8A0` | 已完成、亲子友好标签 |
| 危险色 danger | `#EF4444` | 警告、限制提示 |
| 背景 bg-base | `#FFFBF5` | 页面背景 |
| 卡片阴影 | `0 2px 8px rgba(0,0,0,0.06)` | 默认态 |
| 悬浮阴影 | `0 4px 16px rgba(0,0,0,0.08)` | Hover 态 |
| 字体 | `Inter, system-ui, sans-serif` | 全站字体 |

---

## API 文档

完整 API 规范见 `docs/api/openapi.json`，支持导入 Apifox：

```
Apifox → 导入 → OpenAPI/Swagger → 选择 openapi.json
```

### 接口概览

| 模块 | 端点 | 说明 |
|------|------|------|
| Auth | `POST /api/auth/send-code` | 发送验证码 |
| | `POST /api/auth/login` | 手机号+验证码登录 |
| | `GET /api/auth/profile` | 获取用户信息 |
| 行程 | `GET /api/itineraries` | 行程列表 |
| | `POST /api/itineraries` | 新建行程 |
| | `GET/PUT/DELETE /api/itineraries/{id}` | 详情/更新/删除 |
| | `PATCH /api/itineraries/{id}/status` | 更新状态 |
| 知识库 | `GET /api/knowledge` | 知识列表 |
| | `GET /api/knowledge/search` | 搜索知识 |
| | `GET /api/knowledge/{id}` | 知识详情 |
| 目的地 | `GET /api/destinations` | 目的地列表 |
| | `GET /api/destinations/search` | 搜索目的地 |
| | `GET /api/destinations/{id}` | 目的地详情 |
| AI | `POST /api/ai/chat` (SSE) | AI 对话 |
| | `POST /api/ai/plan` (SSE) | AI 生成行程 |
| | `POST /api/ai/modify` (SSE) | AI 修改行程 |

所有响应格式：

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## 页面路由

| 页面 | 路由 | 说明 |
|------|------|------|
| 登录/注册 | `/login` | 手机号+验证码 |
| 智能规划 | `/plan` | 三栏布局 + AI 对话 |
| 亲子知识库 | `/knowledge` | 分类 + 搜索 + 详情 |
| 目的地库 | `/destinations` | 筛选 + 卡片网格 |
| 我的行程 | `/itineraries` | 状态筛选 + CRUD |

---

## 开发流水线

本项目使用子智能体系统编排开发流程：

1. **coordinator** 接收需求 → 拆分子任务
2. **planner**（可选）→ 输出实施计划
3. **frontend-dev / backend-dev / ai-dev** → 实现代码
4. **tester** → 运行测试 + 检查覆盖率（≥80%）
5. **reviewer** → 代码审查（安全/性能/可维护性）
6. **docs-writer** → 更新文档

详见 `docs/agent-workflow.md`。

---

## 项目路线图

| 阶段 | 版本 | 范围 |
|------|------|------|
| MVP | v1.0 | 核心规划工作台 + 知识库 + 目的地 + 行程管理 |
| 增强版 | v1.1 | 实时数据接入 + 自然语言修改 + 知识库扩量 + PDF 导出 |
| 扩展版 | v2.0 | 多 Agent 并行 + 支付/票务 + 社区/UGC + 多语言 |

---

## 开源协议

MIT
