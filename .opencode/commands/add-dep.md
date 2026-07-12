---
description: 新增依赖 — 用 Context7 查最新版本后安装
---

新增 npm 依赖，自动查询最新版本和兼容性。

**步骤**：

1. 用 Context7 查询库的最新稳定版本和兼容性
2. 在 `pnpm-workspace.yaml` catalogs 检查是否已存在
3. 共享依赖使用 `catalog:` 协议
4. 安装命令：`pnpm add <pkg>@<version> --filter <client|server|ai>`
5. 安装后运行 `pnpm outdated -r` 确认无冲突

**用法**：`/add-dep <包名> [--filter <client|server|ai>]`
