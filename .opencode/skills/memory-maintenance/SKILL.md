---
name: memory-maintenance
description: >
  Maintain project memory system: record decisions, deduplicate entries,
  archive old daily notes. Use after completing any dev task, or when asked
  about memory/archiving/compaction. Follows 5-layer memory architecture.
  Do NOT use for: reading existing memory files, or searching memory
  (use memory_search instead).
origin: ECC
---

# Memory Maintenance — 记忆维护

## 触发条件

- 用户说"清理记忆"、"压缩记忆"、"归档"、"记忆记录"
- 功能开发完成后需要记录决策
- **不要用于**：搜索已有记忆（用 `memory_search` 工具）

## 执行流程

创建 todowrite 列出以下步骤，逐项执行：

| #   | 步骤                                                                                                  | 验证条件                       |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | **记录本次变更** — 调用 `memory_write` 记录关键决策/配置/bugfix/lesson                                | 分类正确，内容简洁明确         |
| 2   | **MEMORY.md 去重** — 检查是否有同类别相似内容，有则 update 而非 append                                | 无重复条目                     |
| 3   | **每日笔记归档** — 检查 `docs/memory/daily/` 超过 7 天的文件 → 归档到 `daily-archives/YYYY-MM.md`     | 归档后保留 `[category]` 关键行 |
| 4   | **对话日志 GC** — 检查 `docs/memory/conversations/active/` 超过 10 条 → 压缩最早的 5 条到 `archives/` | 保留最新 5 条会话              |
| 5   | **心跳检查** — 可选：运行 `compact-memory` 脚本做全量压缩                                             | 脚本无错误                     |

## 分类对照表

| 分类       | 适用场景           | 示例                                            |
| ---------- | ------------------ | ----------------------------------------------- |
| `decision` | 架构决策、技术选型 | "采用 PrismaPg driver adapter"                  |
| `config`   | 配置文件/依赖变更  | "将 server dev 脚本改为 nest start --watch"     |
| `bugfix`   | Bug 修复经验       | "Prisma 7.x 不再支持 PrismaClient() 无参数构造" |
| `lesson`   | 通用经验、注意事项 | "shared 包需提供 ESM + CJS 双入口"              |

## 验收清单

- [ ] memory_write 已调用
- [ ] MEMORY.md 无重复记录
- [ ] 超过 7 天的每日笔记已归档
- [ ] 对话日志不超过 10 条
