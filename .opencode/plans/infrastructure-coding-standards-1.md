---
goal: 将"全局不能硬编码"和"语义化命名"规则系统化融入开发流程
version: 1.0
date_created: 2026-07-12
status: Completed
tags: infrastructure, coding-standards, eslint, constants, naming-conventions
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

将硬编码检测（magic numbers/strings）和语义化命名约束从"人工审查"升级为"工具链强制 + 流程规范"的双层保障。分三阶段实施：基础工具链（ESLint + Prettier + pre-commit）→ 共享常量包（packages/shared）→ 语义化规范沉淀。

## 1. Requirements & Constraints

- **REQ-001**: 所有 magic numbers/strings 必须被 ESLint 检测到并阻止提交
- **REQ-002**: 常量必须集中定义于 packages/shared，代码中不允许直接出现 URL/Status Code/Storage Key 等字面量
- **REQ-003**: 变量/函数/类/组件/文件的命名必须遵循约定且可被自动化检查
- **REQ-004**: pre-commit hook 必须在提交前执行 lint + format，不过则禁止提交
- **CON-001**: 不引入超过 3 个新的顶层 npm 依赖（simple-git-hooks、eslint、prettier）
- **CON-002**: ESLint 必须使用 v9 flat config（eslint.config.mjs）
- **CON-003**: 常量包 packages/shared 必须为 TypeScript，打包输出 ESM + CJS
- **CON-004**: 已有代码中的硬编码值逐步重构，不做一次性大改（避免阻塞开发）
- **CON-005**: lint 命令必须同时可在根目录 `pnpm lint` 和各 package 内独立运行

## 2. Implementation Steps

### Phase 1 — 基础工具链搭建

- GOAL-001: 安装并配置 ESLint v9 (flat config) + Prettier + simple-git-hooks，实现 lint 自动检查 + pre-commit 强制拦截

| Task     | Description                                                                                                                      | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | 安装 eslint v9、@eslint/js、typescript-eslint、eslint-plugin-prettier、prettier、simple-git-hooks、lint-staged 到 workspace root |           |      |
| TASK-002 | 创建 `eslint.config.mjs` — flat config + @eslint/js recommended + typescript-eslint + Prettier                                   |           |      |
| TASK-003 | 配置核心规则：no-magic-numbers、@typescript-eslint/naming-convention、prefer-const、no-var                                       |           |      |
| TASK-004 | 创建 `.prettierrc.json` — 单引号、trailingComma all、printWidth 100                                                              |           |      |
| TASK-005 | 根 package.json 配置 simple-git-hooks + lint-staged                                                                              |           |      |
| TASK-006 | 运行 npx simple-git-hooks；postinstall 中加 simple-git-hooks                                                                     |           |      |
| TASK-007 | 补充 lint:fix + format scripts                                                                                                   |           |      |
| TASK-008 | 测试：pnpm lint 报 magic number 错误；pre-commit 拦截                                                                            |           |      |

### Phase 2 — 共享常量包

- GOAL-002: 创建 packages/shared，集中管理常量；更新 AGENTS.md + agent prompts

| Task         | Description                                                               | Completed | Date |
| ------------ | ------------------------------------------------------------------------- | --------- | ---- |
| TASK-009     | 创建 packages/shared/package.json、tsconfig.json、src/index.ts            |           |      |
| TASK-010     | 更新 pnpm-workspace.yaml 添加 packages/shared                             |           |      |
| TASK-011~015 | 依次创建 constants/api.ts、storage.ts、http.ts、time.ts、error.ts         |           |      |
| TASK-016     | AGENTS.md 追加"常量规范"章节                                              |           |      |
| TASK-017     | 更新 frontend-dev / backend-dev / ai-dev agent prompt，增加硬编码检查步骤 |           |      |
| TASK-018     | 更新 reviewer prompt 审查清单，细化硬编码检查项                           |           |      |

### Phase 3 — 代码迁移 + 语义化规范

- GOAL-003: 迁移现有硬编码到 packages/shared；沉淀命名语义化规范

| Task     | Description                                              | Completed | Date |
| -------- | -------------------------------------------------------- | --------- | ---- |
| TASK-019 | 重构 client/src/api/client.ts → 常量引用                 |           |      |
| TASK-020 | 重构 client/src/stores/auth.ts → 常量引用                |           |      |
| TASK-021 | 重构 server/src/main.ts → 常量引用                       |           |      |
| TASK-022 | AGENTS.md 追加"命名规范"章节                             |           |      |
| TASK-023 | 更新 .vscode/settings.json（ESLint/Prettier 编辑器集成） |           |      |
| TASK-024 | 最终验证：pnpm lint + pnpm typecheck 无报错              |           |      |

## 3. Alternatives

- **ALT-001**: husky + lint-staged — 被 simple-git-hooks 替代，更轻量
- **ALT-002**: @antfu/eslint-config — 被原生 @typescript-eslint 替代，更可控
- **ALT-003**: 各 package 独立安装 ESLint — 被根统一 flat config 替代，减少重复

## 4. Dependencies

- **DEP-001**: ESLint v9（flat config）
- **DEP-002**: typescript-eslint v8
- **DEP-003**: simple-git-hooks
- **DEP-004**: lint-staged
- **DEP-005**: prettier v3 + eslint-plugin-prettier

## 5. Files

| File         | Description                                               |
| ------------ | --------------------------------------------------------- |
| FILE-001     | `eslint.config.mjs`                                       | 根目录 ESLint flat config          |
| FILE-002     | `.prettierrc.json`                                        | Prettier 配置                      |
| FILE-003     | `package.json`                                            | 追加 scripts + hooks + lint-staged |
| FILE-004     | `packages/shared/package.json`                            | 共享常量包                         |
| FILE-005     | `packages/shared/tsconfig.json`                           | 常量包 TS 配置                     |
| FILE-006     | `packages/shared/src/index.ts`                            | 入口                               |
| FILE-007~011 | `packages/shared/src/constants/*.ts`                      | 各分类常量                         |
| FILE-012     | `pnpm-workspace.yaml`                                     | 添加 packages/shared               |
| FILE-013     | `client/src/api/client.ts`                                | 重构                               |
| FILE-014     | `client/src/stores/auth.ts`                               | 重构                               |
| FILE-015     | `server/src/main.ts`                                      | 重构                               |
| FILE-016     | `AGENTS.md`                                               | 追加规范                           |
| FILE-017~019 | `.opencode/prompts/{frontend-dev,backend-dev,ai-dev}.txt` | 更新                               |
| FILE-020     | `.opencode/prompts/reviewer.txt`                          | 更新                               |
| FILE-021     | `.vscode/settings.json`                                   | 更新                               |
| FILE-022     | `.gitignore`                                              | 补充                               |

## 6. Testing

- TEST-001: `pnpm lint` 无错误退出
- TEST-002: `pnpm typecheck` 正常
- TEST-003: magic number 不被 `pnpm lint` 放过
- TEST-004: pre-commit hook 拦截不符合规则的提交
- TEST-005: packages/shared 可被 client/server import

## 7. Risks & Assumptions

- **RISK-001**: no-magic-numbers 与 NestJS 装饰器误报 — 配置 ignoreEnums / ignoreNumericLiteralTypes
- **RISK-002**: simple-git-hooks install 后丢失 — postinstall 脚本兜底
- **RISK-003**: 大量已有硬编码 — 逐步迁移策略（先规则后重构）
- **ASSUMPTION-001**: packages/shared 直接引用 TS 源码无需构建
- **ASSUMPTION-002**: ESLint flat config 兼容 .vue（vue-eslint-parser）

## 8. Related Specifications / Further Reading

- [ESLint v9 Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [typescript-eslint Naming Convention](https://typescript-eslint.io/rules/naming-convention/)
- [simple-git-hooks](https://github.com/toplenboren/simple-git-hooks)
- [Prettier Options](https://prettier.io/docs/en/options.html)
