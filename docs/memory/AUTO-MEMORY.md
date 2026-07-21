# Auto Memory 指令

Auto Memory 采用 **Plugin 运行时钩子 + 自动 LLM 提取 + 手动补充** 三层架构。

- **机械操作**（每日笔记创建、文件修改记录、心跳更新）→ Plugin 自动
- **语义提取**（架构决策/Bug根因/用户偏好/经验教训）→ Plugin 在 session.idle 时自动调用 LLM 提取
- **手动补充** → 调用 `memory_write` 工具

## 检查清单

每轮回复后按顺序检查：

1. 用户纠正了我的行为？ → 写入 `MEMORY.md`
2. 用户说了"记住这个"？ → 写入 `MEMORY.md`
3. 做出了架构决策？ → 写入 `MEMORY.md`
4. 发现了 Bug 根因？ → 写入 `daily/YYYY-MM-DD.md`
5. 当前任务完成？ → 更新 `ACTIVE-CONTEXT.md`
6. 发现 Agent 特有知识？ → 写入 `topics/{agent}.md`

以上操作推荐使用 `memory_write` 工具（自动去重，同时写入 daily 笔记）。

## 写入规则

1. **先读后写**：写入前必须先 READ 目标文件当前内容
2. **去重**：内容已有则更新，无则追加，禁止重复
3. **同轮合并**：同一回复触发的多条记忆合并为一次写入
4. **功能/变更完成 → MEMORY.md 加索引行**：
   `YYYY-MM-DD | feature | 功能名称 | 详见 docs/features/xxx.md`

## 可用工具

- `memory_write(content, category)` — 写入记忆（自动去重+写入 daily）
- `memory_search(query, max_results?)` — 跨文件关键词搜索记忆
- 普通文件操作（Read/Write）仍可用于 AI Agent 特有知识

## 后台提取

除了手动写入，Plugin 自动在 `session.idle` 时执行跨会话决策提取（`consolidateCrossSession`）和每日笔记同步（`syncMemoryFromDaily`）。

当用户说"提取记忆"或"整理记忆"时，建议手动检查 `daily/` 和 `MEMORY.md` 的 Auto Memory 区，确认关键决策和 Bug 根因已记录。

## 预算

- MEMORY.md ≤ 200 行 → 超出时拆分到 topics/
- ACTIVE-CONTEXT.md ≤ 50 行 → 超出时清理已完成项
