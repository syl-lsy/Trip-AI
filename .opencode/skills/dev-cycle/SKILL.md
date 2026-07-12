---
name: dev-cycle
description: >
  Use this skill for any functional code development: implementing features,
  fixing bugs (runtime/data flow/API fields), adding API endpoints, building
  pages with backend integration, or full-stack modules. Runs 7-step quality
  pipeline (lint → test → security → review → docs → push). Do NOT use for:
  read-only analysis, CSS/text/config edits, dependency installs, server
  start, or trivial single-file changes. Core rule: business-logic code
  changes → activate.
origin: ECC
---

# Dev Cycle — 7 步开发流水线

## 核心原则

- 流水线不可跳过、不可重排
- 每步完成后更新 todowrite 状态
- 前一步未 completed → 不允许进入下一步
- 同一任务失败 2 次后向用户报告
- 不需要跑完整流水线的场景（小改动）→ 直接处理，但完成后必须补文档

## 执行流程

加载本技能后，**立即创建 todowrite**，列出以下 7 步：

| #   | 步骤                       | 负责人                              | 验证条件                          |
| --- | -------------------------- | ----------------------------------- | --------------------------------- |
| 1   | **代码实现**               | frontend-dev / backend-dev / ai-dev | 对应 dev agent 完成编码           |
| 2   | **⛔ 工程门禁**            | 自行执行                            | `pnpm check` 零错误               |
| 3   | **✅ 测试验收**            | tester                              | 测试全部通过 / 无测试则仅验证门禁 |
| 4   | **🔒 对抗性测试**          | verifier                            | 无 CRIT-高 问题                   |
| 5   | **👁 代码审查**             | reviewer                            | 结论为"通过"                      |
| 6   | **📝 文档沉淀 + 记忆记录** | docs-writer                         | docs 更新 + `memory_write` 已调用 |
| 7   | **🚀 推送同步**            | 主动询问用户                        | 用户确认执行 / 明确拒绝跳过       |

## 门禁规则

- lint / typecheck / build 任一失败 → 退回 dev agent，不进下一步
- tester 报告失败或覆盖率 < 80% → 退回 dev agent 修复
- verifier 报告 CRIT-高 问题 → 退回 dev agent 修复（安全问题优先）
- reviewer 拒绝 → 退回 dev agent 修复
- 同一任务重试 2 次仍失败 → 向用户报告失败摘要和根因

## 第 7 步特别强化

第 7 步（推送同步）是整个流水线中唯一可能被跳过的步骤，但**跳过的决定权在用户，不在 AI**：

1. **必须主动询问**，措辞固定：
   > "代码已开发完成，是否需要推送到 GitHub 和 Gitee？"
2. 用户确认 → 执行 `zsh scripts/git-sync.sh "feat: 本次提交说明"` 或手动双推
3. 用户拒绝 → 标记该步为 `skipped`，记录用户决策
4. **未询问用户前不允许完成整个流程**
5. 如果前 6 步全部 completed 但第 7 步仍 pending，不得生成完成报告

## 流程判断

在触发本技能时，先判断需求类型：

| 类型                | 示例                                    | 处理方式               |
| ------------------- | --------------------------------------- | ---------------------- |
| 普通对话            | 查代码、问问题、闲聊                    | 直接回复，不走流水线   |
| 小改动              | 文案修改、CSS 调整、单文件简单 Bug 修复 | 直接修改，完成后补文档 |
| 功能开发 / Bug 修复 | 新模块、新页面、新 API、逻辑性 Bug      | **必须走 7 步流水线**  |

## 验收清单

完成所有步骤后，逐项确认：

- [ ] 7 个 todowrite 全部标记 completed（或第 7 步明确 skipped）
- [ ] pnpm check 已通过（lint + typecheck + build 零错误）
- [ ] memory_write 已调用记录关键变更
- [ ] 推送已询问用户（已执行 或 用户明确拒绝）
- [ ] 用户未明确跳过的情况下没有遗漏推送步骤
