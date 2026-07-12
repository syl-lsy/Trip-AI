# MEMORY.md — 长期记忆

Last updated: 2026-07-09

## 项目概览

- **项目名称**: 童行 AI（Trip with Kids）
- **技术栈**: Vue 3 (Composition API) + NestJS + Prisma + PostgreSQL(pgvector) + Redis + LangChain/LangGraph
- **认证**: JWT + 手机验证码，无状态认证
- **项目类型**: 个人开发项目，非团队协作

## 架构决策

- 全栈技术栈为 Vue 3 (Composition API) + NestJS + Prisma + PostgreSQL + pgvector + Redis + LangChain/LangGraph
- AI Agent 采用 IntentRouter 意图分类 → TravelPlanner(4 个子 Agent：交通/住宿/景点/预算) / TravelModifier / KnowledgeQA(RAG)
- API 规范：基础路径 `/api`，统一响应格式 `{success, data?, error?}`，共 19 个端点
- 认证方式：JWT + 手机验证码（无状态认证）
- 8 个子 Agent：coordinator(编排) / planner(只读分析) / frontend-dev / backend-dev / ai-dev / tester / reviewer(用 pro 模型) / docs-writer
- 设计 Token 值：primary=`#4A90D9`、accent=`#F5A623`、success=`#7EB8A0`、danger=`#EF4444`、bg-base=`#FFFBF5`
- MCP 工具全局可用，prompt 中自然嵌入而非独立列表
- 规则文件拆分：AGENTS.md(项目规范) + agent-workflow.md(工作流) + MANAGEMENT.md(记忆规则)
- Feature Docs 规范：新功能→docs/features/新建，已有功能/Bug→直接在已有文档补充
- 会话日志归档策略：日志 > 10 时保留最新 5 条，其余压缩为月度摘要

## 用户偏好

- 偏好子 Agent 流水线模式：coordinator 调度 → dev → tester → reviewer → docs-writer
- 记忆管理偏好：纯文件层 5 层架构（无向量语义索引）
- 自动压缩、去重、分层是记忆管理的核心要求
- scripts/compact-memory 使用 TypeScript 重写，支持 --sync-files 写回
- 开发顺序：先更新规则再建基础设施，确保行为对齐

## 关键配置

- 对话日志路径：docs/memory/conversations/，含 active/ 和 archives/ 子目录
- OpenAPI 文档：docs/api/openapi.json (OpenAPI 3.0.3，19 端点)
- Heartbeat 状态文件：docs/memory/heartbeat-state.json
- MCP 服务清单：FireCrawl、context7、github/gitee、opencode-docs、Figma、langchain-docs、postgres、redis、Tavily-Search、Bing-Search、BoCha

## Bug 修复记录

- 对话日志重复写入：同一 session_id 产生多个日志文件 → 保留最新一份，每个 session_id 只写一个
- Prompt 中 MCP 写法不合规范：独立列表应改为自然嵌入
- ai-dev 缺少 LangChain 相关技能：补充了 langchain/langgraph/langsmith/deep-agents 四个技能
- 记忆存储无去重：同一话题反复产生独立记录，添加 retrieve→update/record 去重逻辑

## 经验教训

- 技能全覆盖收益显著：增加 Agent 技能数量可大幅提升其能力
- 文档优先于代码：项目从零开始时先产出 PRD + OpenAPI + agent-workflow 再开始写代码
- MCP 自动可用：MCP 服务配置在 opencode.json 后全局自动可用，无需在 prompt 声明
- compact-memory 局限性：脚本无权访问 MCP 接口，需通过 assistant 执行导入/删除操作
- 5 层记忆架构优于单层：Hot/Warm/Daily/Topic/Cold 分层可避免膨胀，提升检索精度
- 按 Agent 命名空间存储记忆更利于检索过滤

## 重要日期

- 2026-07-08：记忆管理系统重构规划完成
- 2026-07-09：记忆管理规则拆分为独立文件 MANAGEMENT.md，5 层架构正式启用
- 2026-07-11：AGENTS.md 拆分讨论，确认 OpenCode 不支持 @path 自动导入，走按需读取方案
- 2026-07-11：建立 Feature Docs 规范，每次 dev-cycle 完成后强制沉淀文档到 docs/features/
- 2026-07-11：Auto Memory 机制上线 — AUTO-MEMORY.md + memory-check 成环
- 2026-07-11：Auto Memory Plugin 上线 — Plugin 运行时钩子替代纯 prompt 式机械操作

## 功能完成索引

- 2026-07-11 | feature | Session Memory | 详见 docs/features/session-memory.md
- 2026-07-11 | feature | Tool Result Spillover | 详见 docs/features/spillover.md
- 2026-07-11 | feature | Fork 模式优化 | 详见 docs/features/fork-optimization.md
- 2026-07-11 | enhancement | 记忆系统全面升级（BM25 + 硬截断 + 后台提取 + 对抗性测试 + 文件行走 + Cache 分层） | 详见 docs/features/memory-system.md

## Auto Memory（AI 自动记录）
- 2026-07-12 | decision | 2026-07-12 | decision | 提示词开发规范 — 涉及 prompt 编写/修改/优化必须先加载 prompt-engineering + prompt-engineering-patterns 技能，优化场景加 prompt-optimizer，禁止凭记忆直接编写。规范写入 AGENTS.md，ai-dev.txt 强化为强制规则。

- 2026-07-12 | decision | 决策 10+ 条（API 规范、AI Agent 架构、Design Tokens 等）

- 2026-07-12 | cross-session | ## 下一步
- 2026-07-12 | cross-session | ## 下一步

- 2026-07-11 | decision | itecture] Phase 0 文档落地完成：新建 docs/features/scaffolding.md，更新 project-structure.md（222 行详细文件树），精简 api-endpoints.md 为快速参考索引（去重），更新 ACTIVE-CONTEXT.md

- 2026-07-11 | architecture | Phase 0 文档落地完成：新建 docs/features/scaffolding.md，更新 project-structure.md（222 行详细文件树），精简 api-endpoints.md 为快速参考索引（去重），更新 ACTIVE-CONTEXT.md

- 2026-07-11 | decision | itecture] 2026-07-11 | Phase 0 | 项目脚手架与基础设施完成 — pnpm monorepo + NestJS 后端 + Vue 3 前端 + Prisma Schema (4 tables) + 统一 API 类型层 + 5 页面路由 + Layout 导航壳。全栈 typecheck 与 build 通过。

- 2026-07-11 | architecture | 2026-07-11 | Phase 0 | 项目脚手架与基础设施完成 — pnpm monorepo + NestJS 后端 + Vue 3 前端 + Prisma Schema (4 tables) + 统一 API 类型层 + 5 页面路由 + Layout 导航壳。全栈 typecheck 与 build 通过。

- 2026-07-11 | enhancement | archives GC 双保险机制上线：Plugin 90天 TTL 安全网 (session.idle) + 定时脚本数量 GC (>100, 每小时)

- 2026-07-11 | cross-session | ## 下一步
- 2026-07-11 | cross-session | ## 下一步

- 2026-07-11 | decision | itecture] 记忆系统 9 项优化完成：GC mtime 修复、心跳去重、对话日志归档、段落级 BM25 分块、context-mode 桥接、跨会话知识整合、MEMORY.md 自动同步、回复前检索链指令强化

- 2026-07-11 | architecture | 记忆系统 9 项优化完成：GC mtime 修复、心跳去重、对话日志归档、段落级 BM25 分块、context-mode 桥接、跨会话知识整合、MEMORY.md 自动同步、回复前检索链指令强化


<!-- 以下由 AI 在会话中自动写入，按 YYYY-MM-DD | 类型 | 内容 格式。已有相似条目则更新，不重复。 -->
