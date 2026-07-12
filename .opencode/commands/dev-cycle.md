---
description: 完整开发流水线 — 实现 → 门禁 → 测试 → 对抗 → 审查 → 文档+记忆 → 推送
---

启动完整开发流水线。由 coordinator 编排以下步骤：

1. **planner**（可选）— 需求不清晰时先分析
2. **frontend-dev / backend-dev / ai-dev** — 代码实现
3. **tester** — 工程门禁（lint + typecheck + build）→ 测试套件 → 覆盖率
4. **verifier** — 对抗性测试
5. **reviewer** — 代码审查
6. **docs-writer + memory** — 功能文档沉淀 + 记忆记录
7. **推送同步** — 询问用户是否推送 GitHub + Gitee

**用法**：`/dev-cycle <需求描述>`
