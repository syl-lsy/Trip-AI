---
title: 会话记忆（Session Memory）
date: 2026-07-11
type: enhancement
layer: fullstack
---

## 功能概述

为每个会话维护独立的上下文摘要文件，与项目级的 MEMORY.md 分离。在 compaction 时自动保留，`--resume` 时自动恢复。

Claude Code 的 session-memory 设计启发：每个会话持有独立的 `summary.md`，记录任务描述、文件清单、已做决策和下一步。这是跨压缩会话上下文不丢失的关键机制。

## 变更文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `.opencode/plugins/auto-memory.ts` | 修改 | 新增 `session_update` 工具 + compaction 注入 + GC |

## 关键设计决策

### 1. 存储位置

```
docs/memory/sessions/{sessionId}.md
├─ 每个会话一个独立的 .md 文件
├─ 文件名基于 sessionId（UUID）
└─ 超过 24 小时自动 GC 清理
```

### 2. 自定义工具：session_update

```typescript
session_update(section: "task" | "files" | "decision" | "next", content: string)
```

| 章节 | 用途 |
|------|------|
| task | 当前会话的主要任务描述 |
| files | 涉及的文件清单 |
| decision | 会话中做出的决策 |
| next | 下一步计划 / 待办 |

### 3. Compaction 保留

在 `experimental.session.compacting` 钩子中，自动读取最新（最近修改的）会话 summary 注入到压缩上下文中。这确保压缩后的会话能继承压缩前的任务上下文。

加载逻辑：扫描 `sessions/` 目录，取最新的 `.md` 文件（按文件名排序），注入到 `## 当前会话摘要` 章节。

### 4. 生命周期管理

- **创建**：`session.created` 事件触发时创建空模板
- **写入**：agent 通过 `session_update` 工具更新
- **读取**：compaction 时自动注入
- **清理**：`session.idle` 事件中 GC 超过 24 小时的旧文件

## 对外变更

新增自定义工具：
- `session_update(section, content)` — 更新当前会话摘要

## 测试结果

- TypeScript 类型检查通过
- 与现有 memory_write / memory_search 工具无冲突

## 注意事项

- `session_update` 依赖 `latestSessionId` 模块级变量，在 `session.created` 和 `session.idle` 事件中更新
- 工具响应包含明确的成功/失败信息，失败时返回错误原因
- 会话文件在会话结束后 24 小时自动清理，不需要手动干预
