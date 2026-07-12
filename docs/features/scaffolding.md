---
title: 项目脚手架与基础设施
date: 2026-07-11
type: feature
layer: fullstack
---

## 功能概述

Phase 0 搭建了童行 AI 项目的完整开发基础设施：pnpm monorepo 工作空间、NestJS 后端（含 Prisma ORM + PostgreSQL）、Vue 3 前端（含 Tailwind CSS v4 + Pinia + Vue Router），以及 5 页面路由和导航壳。

## 变更文件清单

### 根项目
| 文件 | 说明 |
|------|------|
| `package.json` | monorepo 根包，定义 dev/typecheck/build 脚本 |
| `pnpm-workspace.yaml` | 声明 client/server/ai/scripts 四包 |
| `tsconfig.base.json` | 共享 TypeScript 配置（strict, ES2022） |
| `.gitignore` | 排除 node_modules/dist/.env 等 |

### 后端（server/）

| 文件 | 说明 |
|------|------|
| `package.json` | 依赖列表（NestJS 11 + Prisma 7 + passport + JWT） |
| `tsconfig.json` | server 专用 TS 配置（commonjs, decorators） |
| `nest-cli.json` | NestJS CLI 配置 |
| `.env` | `DATABASE_URL` 连接字符串 |
| `prisma.config.ts` | Prisma 7 配置（替代 schema 内 datasource url） |
| `prisma/schema.prisma` | 数据模型（User/Itinerary/Knowledge/Destination） |
| `prisma/seed.ts` | 种子数据入口（空壳） |
| `src/main.ts` | NestJS 启动入口，配置 globalPrefix('/api') + CORS + ValidationPipe |
| `src/app.module.ts` | 根模块 |
| `src/common/dto/api-response.ts` | 统一响应 `{success, data?, error?}` |
| `src/common/guards/auth.guard.ts` | JWT 守卫（空壳，Phase 1 实现） |
| `src/common/filters/http-exception.filter.ts` | 全局异常过滤器 |
| `src/common/decorators/current-user.decorator.ts` | 获取当前用户装饰器 |
| `src/auth/auth.module.ts` | 认证模块（空壳） |
| `src/itinerary/itinerary.module.ts` | 行程模块（空壳） |
| `src/knowledge/knowledge.module.ts` | 知识库模块（空壳） |
| `src/destination/destination.module.ts` | 目的地模块（空壳） |

### 前端（client/）

| 文件 | 说明 |
|------|------|
| `package.json` | 依赖列表（Vue 3.5 + Pinia 3 + Vue Router 4 + Tailwind v4 + Axios） |
| `vite.config.ts` | Vite 配置（@tailwindcss/vite 插件、`@` alias、`/api` proxy） |
| `index.html` | HTML 入口（Inter 字体） |
| `tsconfig.json` / `tsconfig.node.json` | TS 配置 |
| `env.d.ts` | Vue 组件类型声明 |
| `src/main.ts` | Vue 应用入口（createApp + Pinia + Router） |
| `src/App.vue` | 根组件（Logo + 标题静态展示） |
| `src/style.css` | Tailwind v4 + 设计 Token（primary/accent/success/danger/bg-base） |
| `src/router/index.ts` | 5 路由（/login, /plan, /knowledge, /destinations, /itineraries），懒加载 |
| `src/layouts/DefaultLayout.vue` | 主应用 Layout（导航栏 + RouterView） |
| `src/layouts/AuthLayout.vue` | 登录页 Layout（居中容器） |
| `src/views/LoginView.vue` | 登录页占位 |
| `src/views/PlanView.vue` | 智能规划占位 |
| `src/views/KnowledgeView.vue` | 知识库占位 |
| `src/views/DestinationsView.vue` | 目的地占位 |
| `src/views/ItinerariesView.vue` | 我的行程占位 |
| `src/api/types.ts` | 类型定义（ApiResponse/User/Itinerary/Knowledge/Destination） |
| `src/api/client.ts` | axios 实例（JWT 拦截器、401 自动跳转登录） |
| `src/stores/auth.ts` | Pinia auth store（空壳） |

### 数据库

| 文件 | 说明 |
|------|------|
| `server/prisma/migrations/20260711154748_init/migration.sql` | 初始迁移（4 表） |

## 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| Prisma 版本 | v7 | 最新版，需 `prisma.config.ts` 替代 schema 内的 `datasource.url` |
| Tailwind 版本 | v4 | 使用 `@import "tailwindcss"` + `@theme`，非 v3 config 文件 |
| 路由懒加载 | 是 | 5 个 view 均使用 `() => import(...)` 代码分割 |
| 后端模块骨架 | 4 空模块 | 为 Phase 1-4 预留，AppModule 尚未注册子模块 |
| `vue-tsc --noEmit` | 替代 `vue-tsc -b` | 避免生成 `.d.ts` 文件污染源代码目录 |
| `moduleResolution: "node10"` | server tsconfig 内覆盖 | base 的 bundler 与 commonjs module 不兼容 |

## 对外变更

### API 规范
- 基础路径 `/api`
- 统一错误格式 `{success: false, error: string}`
- CORS 允许 `localhost:5173`

### 数据库
- 4 表: User, Itinerary, Knowledge, Destination
- pgvector 扩展已启用（Knowledge.embedding 列预留）

### UI
- 导航栏: Logo + 4 页面选项卡
- 设计 Token 已注入 Tailwind theme

## AI Agent 使用指引

### 启动项目
```bash
pnpm dev              # 同时启动前后端
pnpm --filter client dev    # 前端 :5173
pnpm --filter server dev    # 后端 :3000
```

### 添加新功能模块
1. 后端: 创建 `server/src/<name>/` 目录，module/controller/service 三个文件
2. 前端: 创建 view → 注册路由（`router/index.ts`）→ 添加导航项（`DefaultLayout.vue`）
3. 数据库: 更新 `prisma/schema.prisma` → `pnpm prisma:migrate`

### 验证检查
```bash
pnpm --filter server run typecheck   # 后端类型检查
pnpm --filter client run typecheck   # 前端类型检查
pnpm --filter server run build        # 后端编译
pnpm --filter client run build        # 前端编译
curl http://localhost:3000/api        # 应返回统一错误格式
```

## 注意事项
- PostgreSQL 需先启动（`brew services start postgresql@16`）
- 数据库需先创建 `trip-planner` 并启用 pgvector
- Prisma 7 使用 `prisma.config.ts` 加载环境变量（需 dotenv）
- `passport-jwt` 最新版本为 4.x（非 5.x）
- `vue-router` v5 需要 Vite 7，当前锁定 v4
