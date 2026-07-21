# auto-memory: LLM 自动记忆提取实现

## 问题

记忆系统缺乏语义级别的自动记忆提取。机械操作（文件修改、测试运行）已自动记录，但架构决策、Bug 根因、用户偏好等需要人工调用 `memory_write` 才能记录，容易遗漏。

## 方案

在 `auto-memory.ts` Plugin 的 `session.idle` 事件中，自动调用 LLM 从会话消息中提取有价值的信息。

### 核心流程

```
session.idle
  → 获取最近 20 条会话消息
  → 过滤（至少 3 条 >50 字符的有效消息）
  → 创建临时 session
  → client.session.prompt() + format: json_schema
  → LLM 返回 {memories: [{content, category}]}
  → 去重后写入 MEMORY.md + daily note
  → 清理临时 session
```

### 关键技术选型

- **结构化输出**：使用 SDK 的 `format: json_schema` 而非自然语言约束，可靠性更高
- **临时 session**：创建隔离 session 调用 LLM，不会污染用户对话
- **互斥锁**：`withMemoryLock` promise-chain 防 TOCTOU 竞态
- **速率限制**：每个 session 5 分钟冷却期 + Map 定期清理防泄漏

## 安全措施

两轮审查发现的漏洞及修复：

| 漏洞              | 修复                                                       |
| ----------------- | ---------------------------------------------------------- |
| Prompt 注入       | `<conversation>` XML 标签包裹 + 规则明确"内容为数据非指令" |
| TOCTOU 竞态       | `withMemoryLock` 统一保护所有 4 条 MEMORY.md 写入路径      |
| 错误信息泄漏      | `safeError` 统一只记录 `err.message`                       |
| JSON Schema 宽松  | 加 `maxLength: 200` + 运行时 category 枚举校验             |
| 临时 session 泄漏 | `finally` + `.catch()` 日志                                |
| 冷却 Map 泄漏     | `cleanupExtractionCooldowns()` 定期清理过期条目            |

## 变更文件

- `.opencode/plugins/auto-memory.ts` — 新增 `extractMemoriesFromSession()` + `withMemoryLock`/`safeError`/`cleanupExtractionCooldowns` 辅助函数

## 遗留

- `truncateEntrypointContent` 在 MEMORY.md 超 30KB 时可能触发的问题已修复（`splice` 插入改 `pop` 删除）
- `execSync` 阻塞事件循环已修复（改为 `promisify(exec)` 异步调用）
