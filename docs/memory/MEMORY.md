# MEMORY.md — 长期记忆

Last updated: 2026-07-15

## 项目概览

- **项目名称**: 童行 AI（Trip with Kids）
- **技术栈**: Vue 3 (Composition API) + NestJS + Prisma + PostgreSQL(pgvector) + Redis + LangChain/LangGraph
- **认证**: JWT + 手机验证码，无状态认证
- **项目类型**: 个人开发项目，非团队协作

## 架构决策

- 全栈技术栈为 Vue 3 (Composition API) + NestJS + Prisma + PostgreSQL + pgvector + Redis + LangChain/LangGraph
- AI Agent: Deep Agents 框架 (`createDeepAgent`)，3 subagent（planner/modifier/qa），@tool 装饰器
- API 规范：基础路径 `/api`，统一响应格式 `{success, data?, error?}`，共 19 个端点
- 认证方式：JWT + 手机验证码（无状态认证），JWT 密钥从 .env 读取
- 8 个子 Agent：coordinator(编排) / planner(只读分析) / frontend-dev / backend-dev / ai-dev / tester / reviewer(pro 模型) / docs-writer
- 设计 Token：primary=`#4A90D9`、accent=`#F5A623`、success=`#7EB8A0`、danger=`#EF4444`、bg-base=`#FFFBF5`
- MCP 工具全局可用，prompt 中自然嵌入而非独立列表
- 规则文件拆分：AGENTS.md(项目规范) + agent-workflow.md(工作流) + MANAGEMENT.md(记忆规则)
- Feature Docs 规范：新功能→docs/features/新建，已有功能/Bug→直接在已有文档补充
- 会话日志归档策略：日志 > 10 时保留最新 5 条，其余压缩为月度摘要
- 用户头像：multipart/form-data 上传到 /api/user/avatar，文件存 server/uploads/avatars/
- 硬编码检测系统化：ESLint v9+Prettier+simple-git-hooks + packages/shared 常量包

## 用户偏好

- 偏好子 Agent 流水线模式：coordinator 调度 → dev → tester → reviewer → docs-writer
- 记忆管理偏好：纯文件层 5 层架构（无向量语义索引）
- 自动压缩、去重、分层是记忆管理的核心要求
- 开发顺序：先更新规则再建基础设施，确保行为对齐

## 关键配置

- 对话日志路径：docs/memory/conversations/（active/ + archives/）
- OpenAPI 文档：docs/api/openapi.json (OpenAPI 3.0.3，19 端点)
- Heartbeat 状态文件：docs/memory/heartbeat-state.json
- MCP 服务清单：FireCrawl, context7, github/gitee, opencode-docs, Figma, langchain-docs, postgres, redis, Tavily-Search, BoCha 等

## 重要日期

| 日期       | 事件                                                                          |
| ---------- | ----------------------------------------------------------------------------- |
| 2026-07-08 | 记忆管理系统重构规划完成                                                      |
| 2026-07-09 | 记忆管理规则拆分为 MANAGEMENT.md，5 层架构启用                                |
| 2026-07-11 | Phase 0 脚手架完成（pnpm monorepo + NestJS + Vue 3 + Prisma 4 表）            |
| 2026-07-11 | Session Memory + Spillover + Fork 优化完成                                    |
| 2026-07-11 | 记忆系统升级（BM25 + 硬截断 + 后台提取 + 对抗性测试 + 文件行走 + Cache 分层） |
| 2026-07-11 | Auto Memory Plugin 上线，Feature Docs 规范建立                                |
| 2026-07-12 | Phase 1 认证模块完善（JWT 密钥 .env + role 字段 + 共享类型）                  |
| 2026-07-12 | Phase 2 规划工作台全栈实现（三栏布局 + SSE 流式 + Itinerary CRUD + AI Agent） |
| 2026-07-12 | 硬编码检测系统化（ESLint + Prettier + 常量包）完成                            |
| 2026-07-12 | Gitee GitHub 镜像同步配置完成                                                 |
| 2026-07-13 | 前端 SSE 流式渲染改造（ThinkingSection + ToolCallSection）                    |
| 2026-07-13 | Deep Agents 迁移完成（ai/src/ 重构为 createDeepAgent）                        |
| 2026-07-13 | Agent prompts 拆分到独立文件 + prompt-engineering 优化                        |
| 2026-07-14 | Phase 2 bug fix round（修复 11 个问题）                                       |
| 2026-07-14 | dev-cycle 技能升级 8 步（新增自动多轮排查阶段）                               |
| 2026-07-14 | 经验沉淀规范建立（docs/lessons/ + memory_write lesson）                       |

## 功能完成索引

| 日期       | 类型        | 功能                  | 文档                                     |
| ---------- | ----------- | --------------------- | ---------------------------------------- |
| 2026-07-11 | feature     | Session Memory        | docs/features/session-memory.md          |
| 2026-07-11 | feature     | Tool Result Spillover | docs/features/spillover.md               |
| 2026-07-11 | feature     | Fork 模式优化         | docs/features/fork-optimization.md       |
| 2026-07-11 | enhancement | 记忆系统全面升级      | docs/features/memory-system.md           |
| 2026-07-11 | phase       | Phase 0 项目脚手架    | docs/features/scaffolding.md             |
| 2026-07-12 | phase       | Phase 1 用户认证      | — （内嵌在 scaffolding）                 |
| 2026-07-12 | phase       | Phase 2 规划工作台    | docs/features/planning-workbench.md      |
| 2026-07-13 | enhancement | SSE 流式渲染          | （planning-workbench.md 更新）           |
| 2026-07-13 | refactor    | Deep Agents 迁移      | （planning-workbench.md 更新）           |
| 2026-07-14 | bugfix      | Phase 2 bug fix round | docs/features/planning-workbench.md 更新 |

## 经验教训

- 技能全覆盖收益显著：增加 Agent 技能数量可大幅提升其能力
- 文档优先于代码：项目从零开始时先产出 PRD + OpenAPI + agent-workflow 再开始写代码
- MCP 自动可用：MCP 服务配置在 opencode.json 后全局自动可用，无需在 prompt 声明
- compact-memory 局限性：脚本无权访问 MCP 接口，需通过 assistant 执行导入/删除操作
- 5 层记忆架构优于单层：Hot/Warm/Daily/Topic/Cold 分层可避免膨胀，提升检索精度
- 按 Agent 命名空间存储记忆更利于检索过滤
- 不要用 `instanceof` 判断反序列化 LangChain 消息，改用 `_getType()` 判断消息类型
- @nestjs/jwt 的 `expiresIn` 使用 `ms` 包的 `StringValue` 类型
- shared 包需提供 ESM + CJS 双入口兼容 Vite 和 NestJS 的模块系统差异
- Prisma 7.x 不再支持 `new PrismaClient()` 无参数，需 `PrismaPg` driver adapter
- 每次 Bug/功能完成后必须新建 `docs/lessons/<模块>-<问题>.md` + `memory_write` lesson

## Bug 修复记录

- Phase 2 bug fix round: 修复 11 个问题（generationId guard, currentPlan update, isLoading reset, message limit, auto-save, progress events, JSON error 处理, Observable complete+error, itineraryJson DTO, PlanComparison props, knowledge function signature, TimelineCenter SSE）
- Prisma 7 迁移 shadow database 需要 vector 扩展 — 添加 `CREATE EXTENSION IF NOT EXISTS vector`
- 对话日志重复写入：同一 session_id 多个日志 → 保留最新一份
- Prompt 中 MCP 列表写法不合规范 → 改为自然嵌入
- 记忆存储无去重 → 添加 retrieve→update/record 去重逻辑

## Topic 索引

| Topic | 文件                   | 内容                                              |
| ----- | ---------------------- | ------------------------------------------------- |
| 后端  | topics/backend-dev.md  | API 设计、数据库、认证、常量、文件上传            |
| 前端  | topics/frontend-dev.md | 组件约定、UI 模式、Phase 2 组件树                 |
| AI    | topics/ai-dev.md       | Agent 架构、MCP 工具、LangChain 技能、Prompt 规范 |

## Auto Memory（AI 自动记录）

- 2026-07-15 | decision | dev-cycle 流程：小修复（9 问题）只需补文档，无需跑完整 8 步流水线

- 2026-07-15 | cross-session | ## 下一步

- 2026-07-15 | lesson | docs-writer: 记忆系统 9 问题修复文档落地 — memory-system-fix.md 追加 Phase 6、daily/2026-07-15.md 重写为干净摘要

- 2026-07-15 | bugfix | 记忆系统 9 问题修复：清理 MEMORY.md garbage/cross-session noise, heartbeat time order, ACTIVE-CONTEXT refresh, Plugin consolidateCrossSession filter + auto_flush dedup + error logging, MANAGEMENT.md sessions/topic rules

- 2026-07-15 | lesson | auto-memory.ts: 6 处 silent catch 导致错误无法追溯 → 全部改为 `console.error('[auto-memory]', err)`

- 2026-07-15 | lesson | auto-memory.ts: auto_flush 去重只检查 date 未检查 action → 改为 `lastEntry.date===today() && lastEntry.action==='auto_flush'`

- 2026-07-15 | lesson | auto-memory.ts: 跨 session 提取时 `##` 节标题被当作决策写入 → filter 加 `!d.startsWith('##')`

- 2026-07-14 | decision | dev-cycle skill 从 7 步升级为 8 步，新增"自动多轮排查"（Auto Verification Loop）：reviewer + verifier 循环，连续 2 轮 0 新问题通过，最多 3 轮后上报用户
- 2026-07-14 | decision | 记忆系统修复 Phase 1-5 完成：daily note 压缩(15,908→123行), MEMORY.md去重(202→105行), topic文件充实(30→110行), ACTIVE-CONTEXT刷新, auto-memory.ts Plugin修复(正则匹配扩展+跨session过滤+截断注释优化), heartbeat精简(44→7条)
- 2026-07-15 | bugfix | 记忆系统 9 问题修复：清理 MEMORY.md 垃圾/cross-session 噪音、heartbeat 时间序、ACTIVE-CONTEXT 刷新、Plugin 逻辑修复、补充 sessions/topic 规则
