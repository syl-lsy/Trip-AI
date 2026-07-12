---
description: 工程门禁 — 运行 lint + typecheck + build 全量检查
---

在项目根目录执行全部门禁检查：

```bash
pnpm check
```

`pnpm check` 会依次运行：

- `pnpm lint` — ESLint 代码风格检查
- `pnpm typecheck` — TypeScript 类型检查（vue-tsc + tsc）
- `pnpm -r build` — 编译验证（Vite + NestJS）

任一失败会报告具体错误。
