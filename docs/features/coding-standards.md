---
title: 编码规范强制（常量包 + ESLint + Pre-commit）
date: 2026-07-12
type: feature
layer: fullstack
---

## 功能概述

将"全局不能硬编码"和"语义化命名"规则系统化融入开发流程，分三阶段实施。

### Phase 1 — 工具链强制

- ESLint v10 flat config（`eslint.config.mjs`）：开启 `naming-convention`、`no-magic-numbers`、`prefer-const`、`no-var`
- Prettier + eslint-plugin-prettier 统一格式
- simple-git-hooks + lint-staged pre-commit hook

### Phase 2 — 常量包

- `packages/shared`（`@trip/shared`）提供 5 个常量模块：api / storage / http / time / error
- `AGENTS.md` 追加常量规范 + 命名规范章节
- 四个 agent prompt（frontend-dev / backend-dev / ai-dev / reviewer）更新，增加硬编码检查和审查步骤

### Phase 3 — 代码迁移

- `client/src/api/client.ts`：硬编码→ `API_PREFIX` / `STORAGE_KEYS` / `HTTP_STATUS` / `ROUTES`
- `client/src/stores/auth.ts`：硬编码→ `STORAGE_KEYS` / `ROUTES`
- `server/src/main.ts`：硬编码→ `API_PREFIX` / `CORS` / `PORT`
- `.vscode/settings.json` 编辑器集成 ESLint + Prettier

## 变更文件清单

| 文件                                                   | 操作 | 说明                                          |
| ------------------------------------------------------ | ---- | --------------------------------------------- |
| `eslint.config.mjs`                                    | 新增 | ESLint v10 flat config                        |
| `.prettierrc.json`                                     | 新增 | Prettier 配置                                 |
| `package.json`                                         | 修改 | 追加 scripts + simple-git-hooks + lint-staged |
| `packages/shared/package.json`                         | 新增 | 共享常量包                                    |
| `packages/shared/tsconfig.json`                        | 新增 | 常量包 TS 配置                                |
| `packages/shared/src/index.ts`                         | 新增 | 入口                                          |
| `packages/shared/src/constants/api.ts`                 | 新增 | API 路径常量                                  |
| `packages/shared/src/constants/storage.ts`             | 新增 | Storage key 常量                              |
| `packages/shared/src/constants/http.ts`                | 新增 | HTTP 状态码常量                               |
| `packages/shared/src/constants/time.ts`                | 新增 | 超时常量                                      |
| `packages/shared/src/constants/error.ts`               | 新增 | 错误信息常量                                  |
| `pnpm-workspace.yaml`                                  | 修改 | 添加 `packages/*` 通配                        |
| `client/src/api/client.ts`                             | 修改 | 硬编码→常量引用                               |
| `client/src/stores/auth.ts`                            | 修改 | 硬编码→常量引用                               |
| `server/src/main.ts`                                   | 修改 | 硬编码→常量引用                               |
| `AGENTS.md`                                            | 修改 | 追加常量规范 + 命名规范章节                   |
| `.opencode/prompts/frontend-dev.txt`                   | 修改 | 增加硬编码检查步骤                            |
| `.opencode/prompts/backend-dev.txt`                    | 修改 | 增加硬编码检查步骤                            |
| `.opencode/prompts/ai-dev.txt`                         | 修改 | 增加硬编码检查步骤                            |
| `.opencode/prompts/reviewer.txt`                       | 修改 | 细化硬编码/命名审查项                         |
| `.vscode/settings.json`                                | 修改 | ESLint/Prettier 编辑器集成                    |
| `.opencode/plans/infrastructure-coding-standards-1.md` | 新增 | 实施计划                                      |

## 关键设计决策

| 决策                    | 选择                                  | 理由                                                                                            |
| ----------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| ESLint 方案             | `@typescript-eslint` 原生 flat config | 比 `@antfu/eslint-config` 更可控，避免 NestJS 装饰器等规则冲突                                  |
| Pre-commit 方案         | simple-git-hooks                      | 比 husky 更轻量，零二进制依赖，配置即生效                                                       |
| 常量包位置              | `packages/shared`                     | pnpm workspace 包，client / server 可统一引用同一份常量                                         |
| `no-magic-numbers` 等级 | `warn`（server 端关闭）               | 避免 NestJS 装饰器参数（如 `@Column({length: 255})`）误报；server 端硬编码依赖 code review 审查 |
| 现有硬编码策略          | 逐步迁移，不做一次性大改              | 先配规则 + 常量包，已有代码在后续功能开发中逐步重构，不影响现有稳定性                           |

## 对外变更（API / 数据库 / UI）

无。本次变更全部为代码质量基础设施，不涉及：

- API 端点增减或参数变更
- 数据库 Schema 或数据迁移
- 前端 UI 或交互行为

## 测试结果

- `pnpm lint` — 零错误零警告 ✅
- `pnpm typecheck`（client）— 零错误 ✅
- pre-commit hook — 成功拦截并执行 lint-staged ✅
- `@trip/shared` 在 client 和 server 中均可正常 import ✅
- `pnpm build`（server）— 正常编译 ✅

## 注意事项

1. **server 端 `no-magic-numbers` 已关闭**：因 NestJS 装饰器参数大量使用字面量（`@Column({length: 255})`、`@HttpCode(200)`），server 端硬编码依赖 code review 阶段审查。如果未来 NestJS 的 metadata API 支持常量引用，可考虑重新开启。

2. **后续新增功能的开发流程**：自动包含"检查硬编码→提取到 `@trip/shared`"步骤，具体流程见 `AGENTS.md` 的常量规范章节。

3. **server 运行时引用 `@trip/shared`**：确保 server 的 `tsconfig.json` 中 `paths` 或 pnpm workspace 正确解析该包路径，否则编译时会出现模块找不到错误。

4. **lint-staged 配置**：仅对 `*.ts`、`*.vue`、`*.mjs`、`*.json` 文件执行 lint 和 format，避免对非代码文件（如 markdown）做不必要的格式化。

5. **此功能开发遵循了 `AGENTS.md` 中的开发流水线规范**：功能开发完成后走完完整 dev-cycle（含文档沉淀 + 记忆记录 + 推送同步）。
