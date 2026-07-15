# ACTIVE-CONTEXT.md — 当前热记忆

Last updated: 2026-07-15

## 当前优先级

Phase 3~5 功能开发 + 持续稳定性迭代

## 进行中

- [x] Phase 0: 项目脚手架与基础设施 — pnpm monorepo + NestJS 后端 + Vue 3 前端 + Prisma (4 表) + 路由/Layout + API 层
- [x] Phase 0 文档落地 — docs/features/scaffolding.md + project-structure.md 更新 + API 文档清理
- [x] Phase 1: 用户认证模块 — JWT 从 .env 读取 + role 字段 + 共享类型 + 常量引用
- [x] Phase 2: 智能规划工作台（核心）— 全栈实现 + SSE 流式 + AI Agent
- [x] Phase 2 Bug 修复 — 11 个问题已修复，持续稳定中
- [x] 记忆系统修复 — 9 问题已修复（清理垃圾、刷新内容、修复Plugin逻辑、补全规则）
- [ ] Phase 3: 亲子知识库
- [ ] Phase 4: 目的地库
- [ ] Phase 5: 我的行程

## 关键决策

- Phase 0: Prisma 7 使用 `prisma.config.ts` + `dotenv`，schema 内不写 `datasource.url`
- Phase 0: Tailwind v4 使用 `@import "tailwindcss"` + `@theme` 指令
- Phase 0: `vue-tsc --noEmit` 替代 `vue-tsc -b` 避免生成 `.d.ts` 文件污染源码
- Phase 2: Deep Agents 框架 (`createDeepAgent`) 替代 7 个自定义 Agent 类
- Phase 2: SSE 流式渲染使用原生 fetch + ReadableStream（非 EventSource）
- 硬编码检测系统化：ESLint v9 + Prettier + simple-git-hooks + 常量包
- 记忆系统 9 问题修复：cleanup + refresh + Plugin fix + rules completion

## 下次会话上下文

- Phase 2 核心功能已完成（规划工作台全栈 + SSE 流式 + AI Agent），后续需稳定性迭代
- 记忆系统已完成修复（数据清理、内容刷新、Plugin 逻辑修复、规则补全）
- 入口：`继续 Phase 3：亲子知识库`
- 关键踩坑：Prisma 7 config 格式、Deep Agents streamEvents v3、shared 包 ESM+CJS 双入口
