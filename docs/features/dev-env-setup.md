---
title: 开发环境修复
date: 2026-07-12
type: bugfix
layer: fullstack
---

## 功能概述

修复 `pnpm dev` 启动失败和浏览器访问 500 错误，打通全栈开发环境。

## 变更文件清单

| 文件                            | 操作 | 说明                                                         |
| ------------------------------- | ---- | ------------------------------------------------------------ |
| `packages/shared/package.json`  | 修改 | 删除 `"type": "module"`，避免 NestJS 运行时 ESM 解析失败     |
| `server/package.json`           | 修改 | dev 脚本从 `nest start --watch` 改为 `tsx watch src/main.ts` |
| `client/tsconfig.json`          | 修改 | 新增 `"noEmit": true`，防止 TS 向源码目录输出 `.js`/`.map`   |
| `client/vite.config.ts`         | 新建 | 配置 Vue 插件、Tailwind 插件、`@/` 路径别名、API 代理        |
| `client/src/stores/auth.js`     | 删除 | 清理 TS 错误输出的残留文件                                   |
| `client/src/stores/auth.js.map` | 删除 | 同上                                                         |

## 关键设计决策

| 决策                | 方案                                       | 替代方案                                            |
| ------------------- | ------------------------------------------ | --------------------------------------------------- |
| NestJS dev 运行方式 | `tsx watch src/main.ts`                    | `nest start --watch` 无法解析 workspace 的 TS 源码  |
| Shared 包模块系统   | 不声明 `type`，默认 CJS                    | 声明 `"type": "module"` 会导致 Node.js ESM 解析失败 |
| 前端构建工具链      | `@vitejs/plugin-vue` + `@tailwindcss/vite` | 无配置文件时 Vite 无法处理 `.vue` 文件和路径别名    |
| TS 输出控制         | `noEmit: true`                             | 覆盖 base tsconfig 的 `declaration: true`           |

## 对外变更

无（均为开发环境修复，不涉及 API、数据库或 UI 变更）。

## 测试结果

- `pnpm dev` 正常启动：Client (Vite 5173) + Server (Nest 3000)
- 浏览器访问 `/` 自动跳转 `/plan`，控制台 0 errors 0 warnings
- `pnpm check`：lint 通过，typecheck 通过，build 存在预存问题（`@vitejs/plugin-vue` 的 Vite 构建阶段问题，不影响 dev）

## 注意事项

- `tsx watch` 热重载比 `nest start --watch` 更快，但重启策略略有不同（子进程退出后需手动 `rs` 重启）
- 如果新增 workspace 依赖，确保目标包不声明 `"type": "module"`
