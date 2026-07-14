---
name: dev-cycle
description: >
  Use this skill for any functional code development: implementing features,
  fixing bugs (runtime/data flow/API fields), adding API endpoints, building
  pages with backend integration, or full-stack modules. Runs 8-step quality
  pipeline (lint → auto-verification loop → docs → push). Do NOT use for:
  read-only analysis, CSS/text/config edits, dependency installs, server
  start, or trivial single-file changes. Core rule: business-logic code
  changes → activate.
origin: ECC
---

# Dev Cycle — 8 步开发流水线

## 核心原则

- 流水线不可跳过、不可重排
- 每步完成后更新 todowrite 状态
- 前一步未 completed → 不允许进入下一步
- 同一任务失败 2 次后向用户报告
- 不需要跑完整流水线的场景（小改动）→ 直接处理，但完成后必须补文档

## 执行流程

加载本技能后，**立即创建 todowrite**，列出以下 8 步：

| #   | 步骤                       | 负责人                              | 验证条件                          |
| --- | -------------------------- | ----------------------------------- | --------------------------------- |
| 1   | **代码实现**               | frontend-dev / backend-dev / ai-dev | 对应 dev agent 完成编码           |
| 2   | **⛔ 工程门禁**            | 自行执行                            | `pnpm check` 零错误               |
| 3   | **🔄 自动多轮排查**        | reviewer + verifier (循环)          | 连续 2 轮 0 新问题                |
| 4   | **✅ 用户验收**            | 主动询问用户                        | 用户确认通过                      |
| 5   | **📝 文档沉淀 + 记忆记录** | docs-writer                         | docs 更新 + `memory_write` 已调用 |
| 6   | **🚀 推送同步**            | 主动询问用户                        | 用户确认执行 / 明确拒绝跳过       |

## 门禁规则

- lint / typecheck / build 任一失败 → 退回 dev agent，不进下一步
- 自动多轮排查中，同一问题重试 2 次仍出现 → 向用户报告失败摘要和根因
- 排查轮次超过 3 轮仍有新问题 → 向用户报告剩余问题清单，由用户决定是否继续
- reviewer 或 verifier 发现 CRIT-高 问题 → 安全问题优先修复

## 第 3 步详细 — 自动多轮排查（Auto Verification Loop）

这是流水线的核心步骤，**不需要用户触发**，在代码实现 + 门禁通过后自动执行。

### 执行流程

```
开始排查
  │
  ├── Round 1
  │   ├── reviewer 审查代码质量（并行）
  │   ├── verifier 审查安全漏洞（并行）
  │   └── 汇总问题清单 → 显示给用户
  │
  ├── 用户确认后进入 Round 2
  │   ├── 修复 Round 1 全部问题
  │   ├── pnpm check 再次通过
  │   ├── reviewer 回归审查
  │   ├── verifier 回归审查
  │   └── 汇总剩余问题 → 显示给用户
  │
  ├── 如果仍有新问题 → Round 3（同上）
  │
  ├── 连续 2 轮 0 新问题 ✅ → 进入下一步
  │
  └── 超过 3 轮仍有问题 → 上报用户，由用户裁决
```

### 每轮操作

**Round N（N ≥ 1）：**

1. **启动 reviewer（并行）** — 使用 `task(subagent_type: "reviewer")` 审查当前全部变更文件
2. **启动 verifier（并行）** — 使用 `task(subagent_type: "verifier")` 审查安全/边界问题
3. 汇总两个 agent 的反馈，去重后生成问题清单
4. **向用户报告本轮发现** — 格式：
   ```
   ## 第 N 轮排查结果
   🔴 CRIT 问题: X 个
   🟠 HIGH 问题: X 个
   🟡 LOW 问题: X 个
   ---
   [按严重度排序的问题列表]
   ```
5. 如果问题数为 0：
   - 如果是第 1 轮 → 进入 Round 2 以确保深度覆盖
   - 如果是第 2+ 轮且上一轮也是 0 → ✅ 排查通过
6. 如果问题数 > 0 → 修复 → `pnpm check` → 进入 Round N+1
7. **每轮开始前必须先修复上一轮所有问题**，不得跳过

### 最多 3 轮

- 3 轮结束后仍有问题 → 停止并报告："已进行 3 轮排查，仍有 X 个问题未解决，请确认是否继续"
- 用户确认后继续修复，否则跳过排查进入下一步

## 第 4 步 — 用户验收

在第 3 步排查结果全部确认为 0 新问题后：

1. **主动询问用户**："本轮功能开发已完成，所有排查已通过，请确认是否进入下一步？"
2. 用户确认 → 进入第 5 步
3. 用户拒绝 → 返回第 1 步或根据用户指示处理

## 第 6 步特别强化

第 6 步（推送同步）是整个流水线中唯一可能被跳过的步骤，但**跳过的决定权在用户，不在 AI**：

1. **必须主动询问**，措辞固定：
   > "代码已开发完成，是否需要推送到 GitHub 和 Gitee？"
2. 用户确认 → 执行 `zsh scripts/git-sync.sh "feat: 本次提交说明"` 或手动双推
3. 用户拒绝 → 标记该步为 `skipped`，记录用户决策
4. **未询问用户前不允许完成整个流程**
5. 如果前 5 步全部 completed 但第 6 步仍 pending，不得生成完成报告

## 流程判断

在触发本技能时，先判断需求类型：

| 类型                | 示例                                    | 处理方式               |
| ------------------- | --------------------------------------- | ---------------------- |
| 普通对话            | 查代码、问问题、闲聊                    | 直接回复，不走流水线   |
| 小改动              | 文案修改、CSS 调整、单文件简单 Bug 修复 | 直接修改，完成后补文档 |
| 功能开发 / Bug 修复 | 新模块、新页面、新 API、逻辑性 Bug      | **必须走 8 步流水线**  |

## 验收清单

完成所有步骤后，逐项确认：

- [ ] 8 个 todowrite 全部标记 completed（或第 6 步明确 skipped）
- [ ] pnpm check 已通过（lint + typecheck + build 零错误）
- [ ] 自动多轮排查已完成，连续 2 轮 0 新问题
- [ ] 用户已确认验收
- [ ] memory_write 已调用记录关键变更
- [ ] 推送已询问用户（已执行 或 用户明确拒绝）
- [ ] 用户未明确跳过的情况下没有遗漏推送步骤
