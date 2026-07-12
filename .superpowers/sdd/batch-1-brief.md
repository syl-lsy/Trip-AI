# Batch 1: Phase 1 — GC / 心跳 / 日志路径 / 归档

本批包含 Tasks 1, 2, 3（紧密耦合，统一实施）。

## Task 1: 修复 gcOldFiles mtime 逻辑

**背景**：`auto-memory.ts:153-159` 的 `mtime()` 函数始终返回 0，`gcOldFiles` 第 166-186 行读取文件内容长度而非 mtime，导致 GC 不生效。

**修改 `auto-memory.ts`**：

1. **删除整个 `mtime()` 函数**（第 153-159 行）
2. **修改 `gcOldFiles()`**（第 166-186 行）：

```typescript
async function gcOldFiles(dir: string, ttlMs: number, globFilter: (name: string) => boolean): Promise<number> {
  if (!existsSync(dir)) return 0
  const files = await readdir(dir)
  const cutoff = Date.now() - ttlMs
  let removed = 0
  for (const name of files) {
    if (!globFilter(name)) continue
    const fp = join(dir, name)
    try {
      const { stat } = await import("node:fs/promises")
      const stats = await stat(fp)
      if (stats.mtimeMs < cutoff) {
        await rm(fp)
        removed++
      }
    } catch {
      // stat failed or file already deleted
    }
  }
  return removed
}
```

## Task 2: 去重心跳 auto_flush 历史

**修改 `auto-memory.ts:331-333`**：

原来每次都 `push` 一条新记录，改为去重追加：

```typescript
hb.history = hb.history || []
const lastEntry = hb.history[hb.history.length - 1]
if (!lastEntry || lastEntry.date !== today() || lastEntry.action !== "auto_flush") {
  hb.history.push({ date: today(), action: "auto_flush", detail: "Plugin auto-memory flush" })
}
if (hb.history.length > 50) hb.history = hb.history.slice(-50)
```

## Task 3: 修复日志路径 + 归档现有文件

### 归档现有对话日志

1. `conversations/` 根目录下现有 76 个 `.md` 文件（`2026-07-09T*.md` 和 `2026-07-11T*.md`）
2. 将它们移入 `conversations/archives/2026-07/`
3. 创建 `conversations/archives/2026-07/INDEX.md`

```bash
mkdir -p docs/memory/conversations/archives/2026-07
mv docs/memory/conversations/2026-07-09T*.md docs/memory/conversations/archives/2026-07/
mv docs/memory/conversations/2026-07-11T*.md docs/memory/conversations/archives/2026-07/
```

### INDEX.md 内容

```markdown
# 2026-07 对话归档

归档日期：2026-07-11

| 原始文件 | 会话日期 | 说明 |
|---------|---------|------|
| 2026-07-09T*.md | 2026-07-09 | 历史会话日志 |
| 2026-07-11T*.md | 2026-07-11 | 记忆系统升级与优化会话 |
```

### 更新 MANAGEMENT.md

更新"目录结构"中 conversations/ 的说明：

```markdown
conversations/         # 对话日志（由 OpenCode 运行时自动生成）
├── active/            # 最近 5 条活跃会话
├── archives/          # 按月归档
```

## 验证

所有修改完成后运行：
```
cd .opencode && npx -y typescript@latest --noEmit --project tsconfig.json plugins/auto-memory.ts 2>&1
```
Expected: 无错误输出
