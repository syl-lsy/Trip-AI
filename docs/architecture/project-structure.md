---
title: 项目目录结构
date: 2026-07-12
status: published
type: architecture
---

# 项目目录结构

> 童行 AI（Trip with Kids）项目采用 pnpm monorepo 结构，分 client（前端）、server（后端）、ai（AI 层）三个子包。
> 本文档反映 Phase 0 脚手架完成后的实际代码库结构。

```
trip-planner/
│
├── .github/
│   └── workflows/
│       └── ci.yml                   # GitHub Actions CI 工作流
├── .node-version                    # Node 版本锁定（当前 24）
├── client/                          # Vue 3 前端（frontend-dev 操作）
│   ├── env.d.ts                     # 环境声明
│   ├── index.html                   # 入口 HTML
│   ├── vite.config.ts               # Vite 构建配置
│   ├── tsconfig.json                # TypeScript 配置
│   ├── tsconfig.node.json           # Node 端 TS 配置
│   ├── package.json                 # 依赖声明
│   └── src/
│       ├── main.ts                  # Vue 应用入口
│       ├── App.vue                  # 根组件
│       ├── style.css                # 全局样式（Tailwind）
│       ├── api/                     # HTTP 客户端层
│       │   ├── client.ts            # axios 实例 + 拦截器
│       │   └── types.ts             # API 请求/响应类型定义
│       ├── components/
│       │   └── common/              # 通用共享组件（待填充）
│       ├── layouts/                 # 页面布局组件
│       │   ├── DefaultLayout.vue    # 默认布局（含导航栏）
│       │   └── AuthLayout.vue       # 认证相关布局
│       ├── router/
│       │   └── index.ts             # Vue Router 路由配置
│       ├── stores/
│       │   └── auth.ts              # Pinia 认证状态管理
│       └── views/                   # 页面级组件
│           ├── LoginView.vue        # 登录页
│           ├── PlanView.vue         # 行程规划页
│           ├── ItinerariesView.vue  # 行程列表页
│           ├── DestinationsView.vue # 目的地浏览页
│           └── KnowledgeView.vue    # 知识库页
│
├── server/                          # NestJS 后端（backend-dev 操作）
│   ├── .env                         # 环境变量
│   ├── nest-cli.json                # NestJS CLI 配置
│   ├── prisma.config.ts             # Prisma 配置
│   ├── tsconfig.json                # TypeScript 配置
│   ├── package.json                 # 依赖声明
│   ├── test/                        # 测试目录（待填充）
│   ├── prisma/
│   │   ├── schema.prisma            # 数据模型定义（4 张表）
│   │   ├── seed.ts                  # 种子数据脚本
│   │   └── migrations/
│   │       └── 20260711154748_init/ # 初始数据库迁移
│   │           └── migration.sql
│   └── src/
│       ├── main.ts                  # 应用入口（启动脚本）
│       ├── app.module.ts            # 根模块（聚合所有模块）
│       ├── auth/                    # 认证模块
│       │   └── auth.module.ts       # 认证模块定义
│       ├── common/                  # 公共基础设施
│       │   ├── dto/
│       │   │   └── api-response.ts  # 统一响应格式 {success, data?, error?}
│       │   ├── guards/
│       │   │   └── auth.guard.ts    # JWT 认证守卫
│       │   ├── filters/
│       │   │   └── http-exception.filter.ts  # 全局异常过滤器
│       │   └── decorators/
│       │       └── current-user.decorator.ts # @CurrentUser 参数装饰器
│       ├── itinerary/               # 行程模块
│       │   └── itinerary.module.ts  # 行程模块定义
│       ├── destination/             # 目的地模块
│       │   └── destination.module.ts# 目的地模块定义
│       └── knowledge/               # 知识库模块
│           └── knowledge.module.ts  # 知识库模块定义
│
├── ai/                              # AI Agent 层（ai-dev 操作）
│                                    # （待开发，当前为空目录）
│
├── docs/                            # 项目文档（docs-writer 操作）
│   ├── PRD.md                       # 产品需求文档
│   ├── agent-workflow.md            # Agent 工作流编排规范
│   ├── ai-agent-spec.md             # AI Agent 开发完整规范
│   ├── mcp-services.md              # MCP 服务清单
│   ├── api/
│   │   ├── openapi.json             # OpenAPI 3.0.3 规范（19 端点）
│   │   ├── api-endpoints.md         # API 端点汇总文档
│   │   └── README.md
│   ├── architecture/
│   │   ├── tech-stack.md            # 技术选型说明
│   │   ├── project-structure.md     # 本文件：目录结构
│   │   ├── design-tokens.md         # 设计 Token 规范
│   │   └── ai-layer.md              # AI 层架构设计
│   ├── features/                    # 功能完成文档
│   │   ├── feature-template.md      # 功能文档模板
│   │   ├── scaffolding.md           # Phase 0 项目脚手架
│   │   ├── session-memory.md        # Session Memory 实现
│   │   ├── spillover.md             # Tool Result Spillover
│   │   ├── fork-optimization.md     # Fork 模式优化
│   │   └── memory-system.md         # 记忆系统全面升级
│   ├── memory/                      # 5 层记忆体系
│   │   ├── ACTIVE-CONTEXT.md        # 热记忆：当前会话状态
│   │   ├── AUTO-MEMORY.md           # Auto Memory 执行指令
│   │   ├── MEMORY.md                # 长期记忆：架构决策/偏好
│   │   ├── MANAGEMENT.md            # 记忆管理规则
│   │   ├── heartbeat-state.json     # 心跳状态跟踪
│   │   ├── conversations/           # 对话日志
│   │   │   ├── active/              # 最近活跃会话
│   │   │   └── archives/            # 历史归档
│   │   ├── daily/                   # 每日笔记
│   │   │   └── 2026-07-11.md
│   │   ├── sessions/                # 会话数据
│   │   └── topics/                  # Agent 专用知识
│   │       ├── frontend-dev.md
│   │       ├── backend-dev.md
│   │       └── ai-dev.md
│   └── superpowers/                 # Superpowers 相关文档
│
├── scripts/                         # 工具脚本
│   ├── compact-memory.ts            # 记忆压缩
│   ├── compress-conversations.js    # 对话日志压缩
│   ├── extract-memories.ts          # 记忆提取
│   └── archive-conversations.sh     # 对话日志归档
│
├── .opencode/                       # OpenCode IDE 配置
│   ├── opencode.json                # 主配置（Agent 定义/指令/MCP）
│   ├── commands/                    # 自定义命令
│   │   ├── opsx-apply.md
│   │   ├── opsx-archive.md
│   │   ├── opsx-explore.md
│   │   ├── opsx-propose.md
│   │   ├── opsx-sync.md
│   │   └── opsx-update.md
│   ├── generated/                   # 自动生成的文件
│   │   ├── rules.md                 # 合并规则文件
│   │   ├── static-instructions.md   # 静态指令
│   │   ├── manifest.json
│   │   └── rules-manifest.json
│   ├── mcp-servers/
│   │   └── opencode-docs-mcp/       # OpenCode 文档 MCP 服务
│   ├── plans/                       # 实施计划
│   │   └── 2026-07-11-phase0-scaffolding.md
│   ├── plugins/
│   │   └── auto-memory.ts           # Auto Memory 运行时钩子
│   ├── prompts/                     # 各子 Agent 系统提示词
│   │   ├── coordinator.txt
│   │   ├── planner.txt
│   │   ├── frontend-dev.txt
│   │   ├── backend-dev.txt
│   │   ├── ai-dev.txt
│   │   ├── tester.txt
│   │   ├── verifier.txt
│   │   ├── reviewer.txt
│   │   └── docs-writer.txt
│   ├── skills/                      # 本地安装的技能（52 个）
│   │   ├── agent-memory-architecture/
│   │   ├── nestjs-patterns/
│   │   ├── vue-best-practices/
│   │   ├── langchain-architecture/
│   │   ├── prompt-engineering/
│   │   └── ...
│   ├── secrets/                     # 密钥存储
│   └── venv/                        # Python 虚拟环境
│
├── openspec/                        # OpenSpec 变更管理
│   ├── config.yaml
│   ├── specs/
│   └── changes/
│
├── .superpowers/                    # Superpowers 框架配置
├── .agents/                         # Agent Skill 文件
├── .vscode/
│   └── settings.json
│
├── AGENTS.md                        # 项目 Agent 使用规范
├── README.md                        # 项目介绍
├── package.json                     # Monorepo 根 package
├── pnpm-workspace.yaml              # pnpm workspace 定义
├── pnpm-lock.yaml                   # 依赖锁文件
├── tsconfig.base.json               # 共享 TS 基础配置
├── skills-lock.json                 # 技能锁文件
├── .gitignore
└── .pnpmrc.json                     # pnpm 配置
```

## 架构要点

| 项目              | 说明                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------ |
| **Monorepo 工具** | pnpm workspace（`pnpm-workspace.yaml`）                                                    |
| **前端**          | Vue 3 + Composition API + `<script setup>` + Tailwind CSS                                  |
| **后端**          | NestJS + Prisma + PostgreSQL（pgvector）+ Redis                                            |
| **AI 层**         | LangChain + LangGraph + pgvector RAG（待开发）                                             |
| **认证**          | JWT + 手机验证码（无状态）                                                                 |
| **API 路径**      | 基础路径 `/api`，统一响应 `{success, data?, error?}`                                       |
| **数据模型**      | 4 张表（User, Itinerary, Destination, Knowledge）                                          |
| **模块化**        | 后端按业务划分模块：auth / itinerary / destination / knowledge                             |
| **子智能体**      | 9 个子 Agent（coordinator + planner + 3 dev + tester + verifier + reviewer + docs-writer） |
| **记忆系统**      | 5 层文件架构（Hot / Warm / Daily / Topic / Cold）                                          |
| **CI/CD**         | GitHub Actions 持续集成（`.github/workflows/ci.yml`）                                      |
| **上下文管理**    | context-mode 插件 + launchd 自动压缩（`~/.local/bin/opencode-auto-compact.sh`）            |

## Agent 操作边界

| Agent                | 操作目录                   |
| -------------------- | -------------------------- |
| frontend-dev         | `client/`                  |
| backend-dev          | `server/`                  |
| ai-dev               | `ai/`                      |
| docs-writer          | `docs/`                    |
| CI（GitHub Actions） | `.github/workflows/ci.yml` |
| 其余 Agent           | 全项目只读                 |

## 相关文档

- `docs/architecture/tech-stack.md` — 技术选型详情
- `docs/architecture/ai-layer.md` — AI 层架构模块设计
- `docs/architecture/design-tokens.md` — 设计 Token 规范
- `docs/api/api-endpoints.md` — API 端点详情
- `docs/agent-workflow.md` — 子智能体工作流编排
