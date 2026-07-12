# 记忆提取建议

> 自动提取于 2026-07-11

## architecture

- [daily/2026-07-11.md] 
- [daily/2026-07-11.md] AGENTS.md 拆分实施（技术栈、设计规范、API 端点、MCP 服务拆出到 docs/）
- [conversations/active/2026-07-08T23-27-33.md] | `frontend-design` | 前端视觉设计指导 |
- [conversations/active/2026-07-08T23-27-33.md] | `vue-best-practices` / `vue-patterns` / `vue-pinia-best-practices` / `vue-router-best-practices` | Vue 3 开发 |
- [conversations/active/2026-07-08T23-27-33.md] | `nestjs-patterns` | NestJS 后端架构 |
- [conversations/active/2026-07-08T23-27-33.md] | `backend-patterns` | 后端 API 设计、数据库优化 |
- [conversations/active/2026-07-08T23-27-33.md] | `prisma-patterns` | Prisma ORM 模式 |
- [conversations/active/2026-07-08T23-27-33.md] | `postgres-patterns` / `postgresql` / `postgresql-optimization` / `postgres-best-practices` | PostgreSQL 数据库 |
- [conversations/active/2026-07-08T23-27-33.md] | **docs-writer** | 项目知识库工程师：README、API 文档、架构文档等 |
- [conversations/active/2026-07-08T23-27-33.md] | **explore** | 快速探索代码库，搜索文件/内容/架构 |
- [conversations/active/2026-07-08T23-27-33.md] | 名称 | 职责 | 目录 | 模型 | 权限模式 |
- [conversations/active/2026-07-08T23-27-33.md] 4. **AI Agent 部分**：原型中 AI 对话面板展示的是交互层面的效果，PRD 中 AI 需求应该写多深——是否要包含 IntentRouter / TravelPlanner / KnowledgeQA 等 Agent 层的详细设计？
- [conversations/active/2026-07-08T23-27-33.md] | **Technical Specs** | 技术栈选型、Prisma 数据模型、API 端点表、设计 Token 常量表 |
- [conversations/active/2026-07-08T23-27-33.md] | **项目技术栈** | PRD §5 | Vue 3 + NestJS + LangChain + PostgreSQL + pgvector + Redis |
- [conversations/active/2026-07-08T23-27-33.md] | **AI Agent 架构** | PRD §4 | IntentRouter → TravelPlanner(交通/住宿/景点/预算子Agent) / TravelModifier / KnowledgeQA |
- [conversations/active/2026-07-08T23-27-33.md] | **设计规范** | PRD + 原型 CSS | 主色 `#4A90D9`、强调色 `#F5A623`、成功色 `#7EB8A0`、背景 `#FFFBF5`、卡片阴影、字体 |
- [conversations/active/2026-07-08T23-27-33.md] | **技术栈** | 前端 / 后端 / AI / 数据库 / 缓存 |
- [conversations/active/2026-07-08T23-27-33.md] | **AI Agent 架构** | IntentRouter 流程 + 子 Agent 职责 |
- [conversations/active/2026-07-08T23-27-33.md] | **设计规范** | 配色、字体、阴影、CSS 变量 |
- [conversations/active/2026-07-08T23-27-33.md] | **AGENTS.md** | 新增项目概览、技术栈、目录结构、AI Agent 架构、设计规范、API 端点、Agent 颜色标识 | 100 → 202 |
- [conversations/active/2026-07-08T23-27-33.md] | **frontend-dev** | vue-best-practices, vue-patterns, vue-pinia-best-practices, vue-router-best-practices, tailwindcss, frontend-design, performance-optimization, pnpm | Figma, FireCrawl, context7 |
- [conversations/active/2026-07-08T23-27-33.md] | **backend-dev** | nestjs-patterns, backend-patterns, prisma-patterns, postgresql-optimization, postgres-best-practices, redis-patterns, pgvector-semantic-search, zod-validation-expert, pnpm | postgr
- [conversations/active/2026-07-08T23-27-33.md] | **planner.txt** | 工作流程第 1 步 | 用 `FireCrawl` 研究竞品和需求；用 `context7` 查技术选型 |
- [conversations/active/2026-07-08T23-27-33.md] | **frontend-dev.txt** | 步骤 2 后 | 用 `Figma` 读取设计稿；用 `FireCrawl` 参考 UI 方案 |
- [conversations/active/2026-07-08T23-27-33.md] | frontend-dev | 8 | vue-best-practices, vue-patterns, vue-pinia-best-practices, vue-router-best-practices, tailwindcss, frontend-design, performance-optimization, pnpm |
- [conversations/active/2026-07-08T23-27-33.md] | backend-dev | 9 | nestjs-patterns, backend-patterns, prisma-patterns, postgresql-optimization, postgres-best-practices, redis-patterns, pgvector-semantic-search, zod-validation-expert, pnpm |
- [conversations/active/2026-07-08T23-27-33.md] | ai-dev | 8 | ai-product, rag-engineer, rag-implementation, prompt-engineering, prompt-engineering-patterns, prompt-optimizer, pgvector-semantic-search, pnpm |
- [conversations/active/2026-07-08T23-27-33.md] | **langchain** | 使用 LangChain 框架构建 AI Agent（create_agent, @tool, chat models 等）|
- [conversations/active/2026-07-08T23-27-33.md] **当前 ai-dev 的 prompt 中缺失这 4 个技能。** 虽然 `ai-dev.txt` 项目上下文里提到了技术栈（LangChain + LangGraph + DeepAgent + LangSmith），但可调用技能列表中没有引用对应的 skill。
- [conversations/active/2026-07-08T23-27-33.md] 未使用的技能还剩：`canvas-design`, `mcp-builder`, `mcp-server-patterns`, `using-git-worktrees`, `vibe-coding` —— 这些当前项目需求不明确，暂不加入。
- [conversations/active/2026-07-08T23-27-33.md] 同时 `mcp-server-patterns` 也可以一并加入 backend-dev，它提供 Node/TypeScript SDK、Zod 校验、Streamable HTTP 等 MCP 开发模式。
- [conversations/active/2026-07-08T23-27-33.md] | **backend-dev** | **15** | `mcp-builder`, `mcp-server-patterns` — Node/TS SDK 开发 MCP |
- [conversations/active/2026-07-08T23-27-33.md] 4. **AGENTS.md** — 补充技术栈、架构、设计规范、MCP 服务指南

## config

- [daily/2026-07-11.md] 简单说：项目的 **骨架**（文档、配置、工
- [daily/2026-07-11.md] | 维度 | Claude Code | 我们的 OpenCode 配置 | 差距 |
- [daily/2026-07-11.md] **现状**：`memory_search` 做简单的子串匹配，"端口冲突"搜不到"docker-compose mapping"
- [conversations/active/2026-07-08T23-27-33.md] 2. 运行 `node scripts/compact-memory.js <export.json>` 聚类合并
- [conversations/active/2026-07-08T23-27-33.md] 3. **import_file** 导入合并结果
- [conversations/active/2026-07-08T23-27-33.md] 1. **重新登录**：检查 `.opencode/secrets/modelscope-api-key` 是否有效，更新后重试
- [conversations/active/2026-07-08T23-27-33.md] 需要我帮你处理 api key 或做其他事情吗？
- [conversations/active/2026-07-08T23-27-33.md] 所有配置在 `opencode.json` 中的 MCP 服务器，**所有 Agent 自动拥有访问权限**，无需在 prompt 中重复声明即可使用。
- [conversations/active/2026-07-08T23-27-33.md] | **coordinator.txt** | 项目上下文后 | 当需要查阅 OpenCode 配置时使用 `opencode-docs`；需要研究需求时用 `FireCrawl` |
- [conversations/active/2026-07-08T23-27-33.md] | **backend-dev** | 9 | **13** | database-optimizer, postgres-patterns, postgresql, search-routing |

## bugfix

- [conversations/active/2026-07-09T14-35-38.md] `brainstorming`, `context-engineering`, `create-implementation-plan`, `debugging-and-error-recovery`, `executing-plans`, `finishing-a-development-branch`, `harness-engineering`, `prompt-engineering`, 
- [conversations/active/2026-07-08T23-27-33.md] | `debugging-and-error-recovery` / `systematic-debugging` | 系统性调试 |
- [conversations/active/2026-07-08T23-27-33.md] 1. 修复 Memory-plus 会话 → 导出 JSON
- [conversations/active/2026-07-08T23-27-33.md] 2. 修复 Memory-plus 会话后执行全量合并
- [conversations/active/2026-07-08T23-27-33.md] | tester | 4 | tdd-workflow, systematic-debugging, debugging-and-error-recovery, pnpm |
- [conversations/active/2026-07-08T23-27-33.md] 这是计划中需要修复的部分。需要我按之前的计划执行补充吗？

---

运行 --write 将这些写入 MEMORY.md 和 daily note。
