# Phase 0 — 项目脚手架与基础设施 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 搭建 pnpm monorepo 工作空间，完成 NestJS 后端 + Vue 3 前端 + Prisma 的完整脚手架，所有服务可启动，构建通过

**Architecture:** 三包 monorepo（client/server/ai），共享 TypeScript + pnpm catalogs，前后端通过 axios + REST API 通信

**Tech Stack:** Node.js 24 + pnpm 10 + NestJS + Prisma + PostgreSQL 14(+pgvector) + Vue 3 + Vite + Tailwind CSS v4

## 全局约束

- Tailwind CSS v4（使用 `@import "tailwindcss"` + `@theme` 指令）
- 前端始终使用 Composition API + `<script setup>` + TypeScript
- 后端使用 NestJS 模块结构（module/controller/service/guard）
- 所有 API 响应格式 `{ success: boolean, data?: T, error?: string }`
- 路由使用 kebab-case 路径
- 设计 Token: primary=`#4A90D9`, accent=`#F5A623`, success=`#7EB8A0`, danger=`#EF4444`, bg-base=`#FFFBF5`
- 字体: `Inter, system-ui, sans-serif`

---

### Task 0.1: 根项目 + pnpm Workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

**Interfaces:**
- Consumes: 无（根任务）
- Produces: monorepo 骨架，`pnpm install` 可运行

- [ ] **Step 1: 创建 `pnpm-workspace.yaml`**

```yaml
packages:
  - 'client'
  - 'server'
  - 'ai'
  - 'scripts'
```

- [ ] **Step 2: 创建根 `package.json`**

```json
{
  "name": "trip-planner",
  "private": true,
  "scripts": {
    "dev": "concurrently -n client,server -c blue,green \"pnpm --filter client dev\" \"pnpm --filter server dev\"",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "build": "pnpm -r build"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  },
  "engines": {
    "node": ">=18",
    "pnpm": ">=8"
  }
}
```

- [ ] **Step 3: 创建 `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: 创建 `.gitignore`**

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.turbo/
.prisma/
```

- [ ] **Step 5: 运行 `pnpm install` 验证**
