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

- 2026-07-12 | decision | itecture] Phase 2 智能规划工作台全栈实现完成：三栏布局（PlanView fixed定位突破父容器）+ AI对话面板（ChatPanel SSE流式+ProgressSkeleton+QuickActions+KnowledgeRefCard）+ 行程可视化（TimelineCenter/DayCard/TimelineNode 节点渲染+彩色边框+Emoji图标）+ 方案对比弹窗（PlanComparison Teleport弹窗，两方案卡片）+ Itinerary CRUD（5个REST端点，按userId隔离）+ AI SSE 端点（POST /api/ai/chat/plan/modify，@Sse()+Observable，动态import @trip/ai）+ AI Agent层（IntentRouter LLM+关键词降级、TravelPlanner 顺序编排+SSE进度、TravelModifier全量重生成、KnowledgeQA桩）+ MCP工具（TransportTool/AccommodationTool/AmapTool/KnowledgeTool预设示例数据）。详见 docs/features/planning-workbench.md

- 2026-07-12 | architecture | Phase 2 智能规划工作台全栈实现完成：三栏布局（PlanView fixed定位突破父容器）+ AI对话面板（ChatPanel SSE流式+ProgressSkeleton+QuickActions+KnowledgeRefCard）+ 行程可视化（TimelineCenter/DayCard/TimelineNode 节点渲染+彩色边框+Emoji图标）+ 方案对比弹窗（PlanComparison Teleport弹窗，两方案卡片）+ Itinerary CRUD（5个REST端点，按userId隔离）+ AI SSE 端点（POST /api/ai/chat/plan/modify，@Sse()+Observable，动态import @trip/ai）+ AI Agent层（IntentRouter LLM+关键词降级、TravelPlanner 顺序编排+SSE进度、TravelModifier全量重生成、KnowledgeQA桩）+ MCP工具（TransportTool/AccommodationTool/AmapTool/KnowledgeTool预设示例数据）。详见 docs/features/planning-workbench.md

- 2026-07-12 | decision | itecture] Phase 2 Slice 5 方案对比弹窗完成：新建 PlanComparison.vue（Teleport 弹窗，两方案卡片含高铁/航班 radio 选择、合计费用计算、推荐标签，emit close/apply）；修改 OutlineSidebar.vue（启用方案对比按钮，集成 PlanComparison 组件）

- 2026-07-12 | architecture | Phase 2 Slice 5 方案对比弹窗完成：新建 PlanComparison.vue（Teleport 弹窗，两方案卡片含高铁/航班 radio 选择、合计费用计算、推荐标签，emit close/apply）；修改 OutlineSidebar.vue（启用方案对比按钮，集成 PlanComparison 组件）

- 2026-07-12 | decision | itecture] Phase 2 Slice 4 前端 QuickActions + KnowledgeRefCard + 修改请求连接完成：新建 QuickActions.vue（4个快捷按钮：放慢节奏/更换酒店/压缩预算/增加美食，hasPlan控制前两个disabled状态）和 KnowledgeRefCard.vue（蓝色知识引用卡片，点击跳转/knowledge/{id}）；修改 api/plan.ts 新增 subscribeModify（SSE流式调用/ai/modify端点，使用ROUTES.AI.MODIFY常量）；修改 stores/plan.ts 新增 modifyPlan 方法（调用subscribeModify，处理progress/plan/message/error事件）；修改 ChatPanel.vue（快速标签替换为QuickActions组件，handleQuickAction按hasPlan区分走modifyPlan或startGeneration，AI消息气泡中渲染KnowledgeRefCard）。

- 2026-07-12 | architecture | Phase 2 Slice 4 前端 QuickActions + KnowledgeRefCard + 修改请求连接完成：新建 QuickActions.vue（4个快捷按钮：放慢节奏/更换酒店/压缩预算/增加美食，hasPlan控制前两个disabled状态）和 KnowledgeRefCard.vue（蓝色知识引用卡片，点击跳转/knowledge/{id}）；修改 api/plan.ts 新增 subscribeModify（SSE流式调用/ai/modify端点，使用ROUTES.AI.MODIFY常量）；修改 stores/plan.ts 新增 modifyPlan 方法（调用subscribeModify，处理progress/plan/message/error事件）；修改 ChatPanel.vue（快速标签替换为QuickActions组件，handleQuickAction按hasPlan区分走modifyPlan或startGeneration，AI消息气泡中渲染KnowledgeRefCard）。

- 2026-07-12 | decision | itecture] Phase 2 Slice 3 行程可视化渲染完成：新建 TimelineNode.vue（节点渲染：虚线连接线、Emoji图标、时间/标题/费用、知识标签）+ DayCard.vue（左侧4px彩色边框按节点类型着色、天数头部+节奏描述、节点列表）；修改 TimelineCenter.vue（总览条含标题/亲子度评分/预算、图例行、导出PDF按钮、DayCard可滚动列表，保留空状态）；修改 OutlineSidebar.vue（行程标题+成员信息、按天导航列表高亮选中日、底部工具按钮方案对比/导出行程/出行清单，保留空状态）。响应式：Sidebar 桌面显示/移动端 hidden。

- 2026-07-12 | architecture | Phase 2 Slice 3 行程可视化渲染完成：新建 TimelineNode.vue（节点渲染：虚线连接线、Emoji图标、时间/标题/费用、知识标签）+ DayCard.vue（左侧4px彩色边框按节点类型着色、天数头部+节奏描述、节点列表）；修改 TimelineCenter.vue（总览条含标题/亲子度评分/预算、图例行、导出PDF按钮、DayCard可滚动列表，保留空状态）；修改 OutlineSidebar.vue（行程标题+成员信息、按天导航列表高亮选中日、底部工具按钮方案对比/导出行程/出行清单，保留空状态）。响应式：Sidebar 桌面显示/移动端 hidden。

- 2026-07-12 | decision | itecture] Phase 2 Itinerary CRUD + AI SSE 端点完成：新建 ItineraryModule (CRUD: GET/POST/PUT/DELETE /api/itineraries, 按 userId 隔离) 和 AiModule (SSE: POST /api/ai/chat, /api/ai/plan, /api/ai/modify, 使用 @Sse() + Observable, 动态 import @trip/ai)。所有端点使用 AuthGuard('jwt') + @CurrentUser()。itinerary.service 使用 Prisma.ItineraryCreateInput/UpdateInput 强类型避免 any。

- 2026-07-12 | architecture | Phase 2 Itinerary CRUD + AI SSE 端点完成：新建 ItineraryModule (CRUD: GET/POST/PUT/DELETE /api/itineraries, 按 userId 隔离) 和 AiModule (SSE: POST /api/ai/chat, /api/ai/plan, /api/ai/modify, 使用 @Sse() + Observable, 动态 import @trip/ai)。所有端点使用 AuthGuard('jwt') + @CurrentUser()。itinerary.service 使用 Prisma.ItineraryCreateInput/UpdateInput 强类型避免 any。

- 2026-07-12 | decision | itecture] Phase 2 Slice 1 进度骨架屏 + SSE 流式订阅完成：新建 ProgressSkeleton.vue 组件（5步进度指示器），修改 api/plan.ts（SSE subscribeChat/subscribePlan 使用原生 fetch+ReadableStream），修改 stores/plan.ts（progressSteps/startGeneration/cancelGeneration/startPlan），修改 ChatPanel.vue 集成进度骨架屏。API 层使用 Record<string,string> headers 解决 Authorization 命名约定问题，SSE_PREFIX_LENGTH 常量避免 magic number。

- 2026-07-12 | architecture | Phase 2 Slice 1 进度骨架屏 + SSE 流式订阅完成：新建 ProgressSkeleton.vue 组件（5步进度指示器），修改 api/plan.ts（SSE subscribeChat/subscribePlan 使用原生 fetch+ReadableStream），修改 stores/plan.ts（progressSteps/startGeneration/cancelGeneration/startPlan），修改 ChatPanel.vue 集成进度骨架屏。API 层使用 Record<string,string> headers 解决 Authorization 命名约定问题，SSE_PREFIX_LENGTH 常量避免 magic number。

- 2026-07-12 | decision | itecture] Phase 2 Slice 1 完成：PlanView 使用 fixed 定位(inset-0 top-14)突破 DefaultLayout 的 max-w-7xl 约束，实现全宽三栏布局。ChatPanel 使用 Pinia store 管理消息状态，API 层引用 ROUTES.AI.CHAT 常量。已添加 ROUTES.AI.CHAT 到共享常量包。
- 2026-07-12 | decision | itecture] Phase 2 AI Agent 层已实现：ai/ 包创建 14 个文件，包括 IntentRouter（LLM + 关键词降级）、TravelPlanner（顺序编排 + SSE 事件流）、TravelModifier（全量重新生成）、KnowledgeQA（RAG 桩）、以及 Transport/Accommodation/Amap/Knowledge 四个工具类（预设示例数据）。CJS 构建输出到 dist/，供 NestJS 服务端调用。

- 2026-07-12 | architecture | Phase 2 AI Agent 层已实现：ai/ 包创建 14 个文件，包括 IntentRouter（LLM + 关键词降级）、TravelPlanner（顺序编排 + SSE 事件流）、TravelModifier（全量重新生成）、KnowledgeQA（RAG 桩）、以及 Transport/Accommodation/Amap/Knowledge 四个工具类（预设示例数据）。CJS 构建输出到 dist/，供 NestJS 服务端调用。

- 2026-07-12 | architecture | Phase 2 Slice 1 完成：PlanView 使用 fixed 定位(inset-0 top-14)突破 DefaultLayout 的 max-w-7xl 约束，实现全宽三栏布局。ChatPanel 使用 Pinia store 管理消息状态，API 层引用 ROUTES.AI.CHAT 常量。已添加 ROUTES.AI.CHAT 到共享常量包。

- 2026-07-12 | config | superpowers 插件从全局 ~/.config/opencode/opencode.jsonc 移至项目级 .opencode/opencode.json，遵循配置优先级规范（.opencode/ > 项目级 > 全局）

- 2026-07-12 | config | 6个未引入流程的技能已集成到Agent prompts：memory-maintenance→docs-writer，backend-module/prisma-operations/constants-extension→backend-dev，frontend-page/constants-extension→frontend-dev，git-sync→coordinator

- 2026-07-12 | decision | 用户头像上传功能已完成：采用 multipart/form-data 上传到 /api/user/avatar 端点，文件存储到 server/uploads/avatars/ 目录，数据库只存相对路径，前端使用 Pinia store 管理上传状态

- 2026-07-12 | config | dev-cycle skill description 优化：3 轮迭代后从中文改为英文描述，核心信号改为 business-logic code changes → activate，提高触发精度

- 2026-07-12 | config | 三层可靠性保障：AGENTS.md 第 0 步强制加载 dev-cycle skill + coordinator.txt 流程加加载指令 + Plugin compaction 注入流水线指令

- 2026-07-12 | decision | itecture] 用户详情页面已实现：新增 GET /api/user/profile-detail 端点和 /profile 前端路由/页面，展示当前登录用户的手机号和昵称

- 2026-07-12 | config | 登录页提交按钮颜色从 #4A90D9（primary）改为 #F5A623（橙色），在 LoginView.vue 中直接替换 Tailwind class 为 bg-[#F5A623] + hover:bg-[#F5A623]/90

- 2026-07-12 | architecture | 用户详情页面已实现：新增 GET /api/user/profile-detail 端点和 /profile 前端路由/页面，展示当前登录用户的手机号和昵称

- 2026-07-12 | config | AGENTS.md 新增 Skill 和 MCP 开发规范：创建/修改 skill 前必须先加载 skill-creator skill，创建/修改 MCP 前必须先加载 mcp-builder skill

- 2026-07-12 | config | coordinator.txt + dev-cycle.md + fork-optimization.md + coding-standards.md 同步修复：所有流水线引用从6步更新为7步（新增推送同步），docs-writer触发条件统一为"每次dev-cycle完成后强制执行"

- 2026-07-12 | config | AGENTS.md + agent-workflow.md 全面修复：流水线从6步增至7步（新增🚀推送同步），小改动补档策略细化，门禁描述去歧义，去除重复内容，tester增加无测试套件降级策略，docs-writer增加memory_write步骤，所有mermaid流程图增加推送环节

- 2026-07-12 | decision | itecture] Phase 1 认证模块完善完成：JWT 密钥改为从 .env 读取（JWT_SECRET, JWT_EXPIRES_IN），Prisma User 模型添加 role 字段（默认 "user"），共享类型移至 packages/shared/src/api/types.ts，Auth 路由路径定义为 ROUTES.AUTH.* 常量

- 2026-07-12 | lesson | @nestjs/jwt 的 expiresIn 使用 ms 包的 StringValue 类型，env 变量读取需 as JwtSignOptions['expiresIn'] 类型断言

- 2026-07-12 | bugfix | Prisma 7 迁移 shadow database 需要 vector 扩展 — 在初始 migration.sql 中添加 CREATE EXTENSION IF NOT EXISTS vector 避免 P3018 错误

- 2026-07-12 | architecture | Phase 1 认证模块完善完成：JWT 密钥改为从 .env 读取（JWT_SECRET, JWT_EXPIRES_IN），Prisma User 模型添加 role 字段（默认 "user"），共享类型移至 packages/shared/src/api/types.ts，Auth 路由路径定义为 ROUTES.AUTH.* 常量

- 2026-07-12 | config | 清理 git 仓库：排除 auto-generated 文件（conversations/sessions/daily/字体），移除 5.2MB 字体 + 130+ 自动生成文件的跟踪，仓库体积大幅减小

- 2026-07-12 | config | 每日笔记自动归档阈值从 30 天改为 7 天：auto-memory.ts Plugin 新增 gcOldDailyNotes()，归档到 daily-archives/YYYY-MM.md，保留 [category] 关键行

- 2026-07-12 | lesson | shared 包需提供 ESM + CJS 双入口（exports.import→TS 源码，exports.require→编译后的 CJS），兼容 Vite 和 NestJS 的模块系统差异

- 2026-07-12 | decision | 采用 PrismaPg driver adapter 替代无参数构造 PrismaClient，因为 Prisma 7.x 不再支持 new PrismaClient() 无参数

- 2026-07-12 | config | server dev 脚本改为 nest start --watch，shared 包需先 build 为 CJS 供 NestJS 使用（import→TS 源码给 Vite，require→CJS 给 NestJS）

- 2026-07-12 | decision | itecture] 将硬编码检测和语义化命名规则系统化融入开发流程已完成。三阶段实施：Phase 1 ESLint v9+Prettier+simple-git-hooks（flat config, naming-convention, no-magic-numbers）；Phase 2 packages/shared 常量包（api/storage/http/time/error）；Phase 3 重构现有代码硬编码。现在 pnpm lint 干净通过，pre-commit hook 强制拦截不合规代码。

- 2026-07-12 | architecture | 将硬编码检测和语义化命名规则系统化融入开发流程已完成。三阶段实施：Phase 1 ESLint v9+Prettier+simple-git-hooks（flat config, naming-convention, no-magic-numbers）；Phase 2 packages/shared 常量包（api/storage/http/time/error）；Phase 3 重构现有代码硬编码。现在 pnpm lint 干净通过，pre-commit hook 强制拦截不合规代码。

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
