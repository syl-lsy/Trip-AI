# ACTIVE-CONTEXT.md — 当前热记忆

Last updated: 2026-07-12

## 当前优先级

Phase 1 — 用户认证模块（后端 Auth API + 前端登录页）

## 进行中

- [x] Phase 0: 项目脚手架与基础设施 — pnpm monorepo + NestJS 后端 + Vue 3 前端 + Prisma (4 表) + 路由/Layout + API 层
- [x] Phase 0 文档落地 — docs/features/scaffolding.md + project-structure.md 更新 + API 文档清理
- [x] Phase 1: 用户认证模块 — JWT 从 .env 读取 + role 字段 + 共享类型 + 常量引用

## 等待中

- Phase 2: 智能规划工作台（核心）
- Phase 3: 亲子知识库
- Phase 4: 目的地库
- Phase 5: 我的行程

## 关键决策

- Phase 0: Prisma 7 使用 `prisma.config.ts` + `dotenv`，schema 内不写 `datasource.url`
- Phase 0: Tailwind v4 使用 `@import "tailwindcss"` + `@theme` 指令
- Phase 0: `vue-tsc --noEmit` 替代 `vue-tsc -b` 避免生成 `.d.ts` 文件污染源码

## 下次会话上下文

- 项目脚手架已完成，可开始 Phase 1 认证模块
- 入口：`dev-cycle 实现 Phase 1：用户认证模块`
- 后端 `server/src/auth/` 空模块已就绪，前端登录页占位已创建
- 关键踩坑：Prisma 7 config 格式、passport-jwt v4、vue-router v4
