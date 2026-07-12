---
title: 子 Agent 并行派发（Fork 模式优化）
date: 2026-07-11
type: enhancement
layer: fullstack
---

## 功能概述

优化 coordinator 的派发策略，让不冲突的子 Agent 并行执行，减少串行等待时间。

Claude Code 的三种 sub-agent 模式启发：

- **fork**：继承 parent 上下文，共享 prompt cache（最省 token）
- **teammate**：独立 pane，通过文件通信
- **worktree**：独立 git branch，完全隔离

## 变更文件清单

| 文件                                | 操作 | 说明                                 |
| ----------------------------------- | ---- | ------------------------------------ |
| `.opencode/prompts/coordinator.txt` | 修改 | 加入并行派发策略和独立子任务批量处理 |

## 关键设计决策

### 1. 三种并行策略

| 策略         | 适用场景                                                       | 说明                                 |
| ------------ | -------------------------------------------------------------- | ------------------------------------ |
| **跨层并行** | 需求同时涉及 client/ + server/ + ai/                           | 三层互不依赖，使用 task() 同时派发   |
| **只读批量** | tester + verifier（只读 agent）                                | 同一批派发，收集所有结果后统一处理   |
| **串行依赖** | dev → tester → verifier → reviewer → docs-writer+memory → 推送 | 每一步的输出是下一步的输入，必须串行 |

### 2. 流水线对比

**优化前（全串行）：**

```
planner → frontend-dev → backend-dev → ai-dev → tester → verifier → reviewer
                                                                     ↓
                                                               docs-writer
                                                                     ↓
                                                               推送同步
```

**优化后（并行 + 串行混合）：**

```
planner → 拆分为三 ─┬→ frontend-dev ─┐
                    ├→ backend-dev   ├─（并行 dev）
                    └→ ai-dev       ┘
                           ↓
                    tester ──→ verifier ──→ reviewer ──→ docs-writer ──→ 推送同步
                    （串行）    （串行）      （串行）        +memory
```

### 3. Coordinator Prompt 新增指令

在派发规则中明确四种情况：

- **跨层并行**：同时派发给 frontend-dev、backend-dev、ai-dev
- **依赖串行**：dev → tester → verifier → reviewer → docs-writer+memory → 推送
- **只读批量**：tester、verifier、memory-check 可并行
- **失败重试**：独立子任务互不影响，失败只退回对应 agent

## 对外变更

无（仅 prompt 层面优化，不涉及 API 或工具变更）

## 测试结果

- Prompt 语法正确
- 与现有 dev-cycle 命令兼容

## 注意事项

- `task()` 工具本身支持并行派发，coordinator 只需在 prompt 中描述并行意图
- 并行派发时注意 token 消耗：多个 agent 同时工作意味着 multi-turn 消耗
- 跨层并行的前提是三层没有共享状态依赖（如新功能启动时通常满足）
