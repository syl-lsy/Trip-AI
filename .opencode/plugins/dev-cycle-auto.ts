import type { Plugin } from '@opencode-ai/plugin'

export const DevCyclePlugin: Plugin = async () => {
  return {
    'experimental.session.compacting': async (_input, output) => {
      output.context.push(`
## Dev Cycle 流水线

功能开发 / Bug 修复时，必须按以下 7 步执行，不可跳过或重排：

1️⃣ **代码实现** → frontend-dev / backend-dev / ai-dev
2️⃣ **⛔ 工程门禁** → pnpm check（lint + typecheck + build）
3️⃣ **✅ 测试验收** → tester
4️⃣ **🔒 对抗性测试** → verifier
5️⃣ **👁 代码审查** → reviewer
6️⃣ **📝 文档沉淀 + memory_write** → docs-writer
7️⃣ **🚀 推送同步** → 主动询问用户后执行
`)
    },
  }
}
