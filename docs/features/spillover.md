---
title: Tool Result Spillover（大输出溢出）
date: 2026-07-11
type: enhancement
layer: fullstack
---

## 功能概述

对大工具输出（Bash/Read >8KB）自动备份到磁盘文件，提供 `spillover_list` 和 `spillover_read` 工具供 agent 按需检索完整内容。

Claude Code 的设计启发：大工具输出不会被丢弃，而是溢出到磁盘（仅 8KB 预览发送给模型），完整内容可通过文件工具读取。这防止单次大输出撑爆 context window。

## 变更文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `.opencode/plugins/auto-memory.ts` | 修改 | 新增溢出写入逻辑 + `spillover_list` + `spillover_read` + GC |

## 关键设计决策

### 1. 触发条件

工具输出 > 8192 字节（8KB）时自动触发溢出。仅针对 `bash` 和 `read` 工具（写工具的输出通常较小且不重复读取）。

### 2. 存储位置

```
docs/memory/spillover/{timestamp}-{tool}.txt
├─ 文件名基于时间戳 + 工具名
└─ 内容截断至 100KB 上限（防止单个文件过大）
```

### 3. 自定义工具

**spillover_list**
```typescript
spillover_list(limit?: number, tool_filter?: "bash" | "read")
```
列出最近的溢出文件，按时间倒序，可选按工具名过滤。

**spillover_read**
```typescript
spillover_read(filename: string)
```
读取指定溢出文件的完整内容（最多 50KB）。

### 4. 生命周期

- **写入**：`tool.execute.after` 钩子中异步写入（不阻塞主流程）
- **读取**：agent 通过 `spillover_list` → `spillover_read` 两步检索
- **清理**：`session.idle` 事件中 GC 超过 24 小时的旧文件

### 5. 安全限制

- 路径遍历防护：检查请求路径是否以 spillover 目录为前缀
- 输出截断：写入上限 100KB，读取上限 50KB
- 自动清理：24 小时后自动删除

## 对外变更

新增自定义工具：
- `spillover_list(limit?, tool_filter?)` — 列出溢出文件
- `spillover_read(filename)` — 读取溢出文件内容

## 测试结果

- TypeScript 类型检查通过
- 路径安全检查覆盖

## 注意事项

- Plugin 不能修改工具返回值，所以溢出写入是后台异步的，不影响原始输出
- 溢出文件自动保存大输出的完整内容，agent 可通过 spillover_read 回溯，比重新执行命令更省 token
- 建议只有在 context 紧张时才使用 spillover 回溯，因为读取溢出文件本身也消耗 token
