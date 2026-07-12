---
title: CI 流水线
date: 2026-07-12
type: feature
layer: fullstack
---

## 功能概述

基于 GitHub Actions 的持续集成流水线，每次推送/PR 自动运行工程门禁检查。

## 配置位置

| 文件                       | 说明                      |
| -------------------------- | ------------------------- |
| `.github/workflows/ci.yml` | GitHub Actions 工作流定义 |
| `.node-version`            | Node.js 版本锁定          |

## 触发条件

| 事件           | 分支   |
| -------------- | ------ |
| `push`         | `main` |
| `pull_request` | `main` |

## 流水线阶段

```
checkout → setup pnpm → setup node → pnpm install →
prisma generate → prisma db push → lint → typecheck → test → build
```

| 阶段        | 命令                                                     | 失败处理               |
| ----------- | -------------------------------------------------------- | ---------------------- |
| 安装依赖    | `pnpm install`（缓存 pnpm store）                        | 安装失败直接退出       |
| Prisma 生成 | `pnpm --filter server prisma:generate`                   | 生成失败直接退出       |
| 数据库建表  | `pnpm --filter server prisma db push --accept-data-loss` | 建表失败，测试阶段跳过 |
| Lint        | `pnpm lint`                                              | —                      |
| Typecheck   | `pnpm typecheck`                                         | —                      |
| 测试        | `pnpm -r test`（无测试文件时跳过）                       | —                      |
| 构建        | `pnpm -r build`                                          | —                      |

## 运行环境

| 项目       | 配置                            |
| ---------- | ------------------------------- |
| 操作系统   | `ubuntu-latest`                 |
| Node.js    | `24`（由 `.node-version` 控制） |
| pnpm       | 自动匹配 lockfile 版本          |
| PostgreSQL | `postgres:16` 容器，自动销毁    |

## 数据库（PostgreSQL 容器）

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: lsygcy1314
      POSTGRES_PASSWORD: 123456
      POSTGRES_DB: trip-planner
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

## 缓存策略

pnpm store 缓存通过 `actions/setup-node` 的 `cache: pnpm` 自动管理，后续运行通常只需 10-30 秒完成依赖安装。

## 与工程门禁的关系

CI 流水线与 AGENTS.md 中定义的「工程门禁」检查内容一致：

- lint（ESLint）
- typecheck（TypeScript / vue-tsc）
- test（Vitest，覆盖率 ≥ 80%）
- build（Vite / NestJS 编译）

本地可通过 `pnpm check` 命令手动执行全部门禁检查。
