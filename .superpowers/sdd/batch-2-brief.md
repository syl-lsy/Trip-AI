# Batch 2: Phase 2+3 — 搜索升级 / 跨会话整合 / MEMORY 同步

本批包含 Tasks 4, 5, 6, 7, 8（修改 `auto-memory.ts`）。

## Task 4: memory_search 段落级分块

**背景**：当前 BM25 对每一行单独评分，多行表达的概念被切碎。

**修改 `auto-memory.ts:399-442`**：将文档单元从单行改为段落级。

添加新函数：

```typescript
function extractParagraphs(lines: string[]): { text: string; startLine: number }[] {
  const paragraphs: { text: string; startLine: number }[] = []
  let current: string[] = []
  let startLine = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim() || line.startsWith("#") || line.startsWith("<!--") || line.startsWith("---")) {
      if (current.length > 0) {
        paragraphs.push({ text: current.join(" ").trim(), startLine })
        current = []
      }
      if (line.startsWith("## ") || line.startsWith("# ")) startLine = i + 1
      continue
    }
    if (current.length === 0) startLine = i + 1
    current.push(line.trim())
  }
  if (current.length > 0) paragraphs.push({ text: current.join(" ").trim(), startLine })
  return paragraphs
}
```

然后在 `memory_search` 的 `execute` 函数中，将原来按行遍历改为按段落：

```typescript
// MEMORY.md — 原来 memLines.forEach 改为段落
const memParagraphs = extractParagraphs(memLines)
for (const p of memParagraphs) {
  allDocs.push({ text: p.text, file: INDEX_FILE, line: p.startLine })
}

// daily notes — 同理，sectionLines 按段落
// topic files — 同理，sectionLines 按段落
```

## Task 5: memory_search 桥接 context-mode

**修改 `memory_search`**：BM25 搜索结果排序前，追加 context-mode 查询结果。

在 `results.sort(...)` 前（line ~508 附近）插入：

```typescript
// 追加 context-mode 搜索结果
async function queryContextMode(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const { execSync } = await import("child_process")
    const result = execSync(
      `opencode run --json --prompt "ctx_search(queries: [${JSON.stringify(query)}], limit: ${maxResults})"`,
      { encoding: "utf-8", timeout: 10000 }
    ).catch(() => "[]")
    const parsed = JSON.parse(result)
    return Array.isArray(parsed) ? parsed.slice(0, maxResults).map((r: any, i: number) => ({
      file: r.source || "context-mode",
      line: r.line || 0,
      content: r.text || JSON.stringify(r),
      score: 0.5 / (i + 1),
      description: "",
      type: "",
    })) : []
  } catch {
    return []
  }
}

const ctxResults = await queryContextMode(q, args.max_results)
results.push(...ctxResults)
```

## Task 6: 跨会话知识整合

在 `session.idle` 事件末尾增加跨 session 对比。

新增函数：

```typescript
async function consolidateCrossSession(base: string): Promise<void> {
  const sDir = sessionsDir(base)
  if (!existsSync(sDir)) return
  const files = await readdir(sDir)
  const mdFiles = files.filter((f: string) => f.endsWith(".md")).sort().reverse()
  if (mdFiles.length < 3) return

  const recent: string[] = []
  for (const f of mdFiles.slice(0, 3)) {
    const content = await readSafe(join(sDir, f))
    const decisionMatch = content.match(/## 决策\n\n([\s\S]*?)(?=\n## |$)/)
    if (decisionMatch) recent.push(decisionMatch[1])
  }

  const allDecisions = recent.join("\n").split("\n").map(l => l.trim()).filter(Boolean)
  const seen = new Set<string>()
  const common: string[] = []
  for (const d of allDecisions) {
    const key = d.replace(/^- /, "").trim()
    if (seen.has(key)) common.push(d)
    seen.add(key)
  }

  if (common.length > 0) {
    const memPath = join(base, INDEX_FILE)
    const existing = await readSafe(memPath)
    const marker = "## Auto Memory（AI 自动记录）"
    const lines = common.map(d => `- ${today()} | cross-session | ${d.replace(/^- /, "")}`)
    const toAdd = lines.filter(l => !existing.includes(l.slice(0, 60)))
    if (toAdd.length > 0) {
      const parts = existing.includes(marker) ? existing.split(marker) : [existing, ""]
      const updated = `${parts[0]}${marker}\n${toAdd.join("\n")}\n${parts[1] || ""}`
      await writeFile(memPath, truncateEntrypointContent(updated), "utf-8")
    }
  }
}
```

在 `session.idle` 事件末尾（所有现有逻辑之后）调用 `consolidateCrossSession(base)`。

## Task 7: MEMORY.md 自动更新

在 `session.idle` 事件末尾增加从 daily 同步决策到 MEMORY.md。

新增函数：

```typescript
async function syncMemoryFromDaily(base: string): Promise<void> {
  const todayPath = join(base, "daily", `${today()}.md`)
  if (!existsSync(todayPath)) return

  const content = await readSafe(todayPath)
  const decisionLines = content.split("\n").filter(l =>
    /^- \[?(?:决策|decision|arch|架构|决定|选择)\]?/i.test(l)
  )

  if (decisionLines.length === 0) return

  const memPath = join(base, INDEX_FILE)
  const existing = await readSafe(memPath)
  const marker = "## Auto Memory（AI 自动记录）"

  const lines = decisionLines.map(l => {
    const clean = l.replace(/^- \[?(?:决策|decision|arch|架构|决定|选择)\]?\s*/i, "")
    return `- ${today()} | decision | ${clean}`
  })

  const toAdd = lines.filter(l => !existing.includes(l.slice(0, 60)))
  if (toAdd.length === 0) return

  if (existing.includes(marker)) {
    const parts = existing.split(marker)
    const updated = `${parts[0]}${marker}\n${toAdd.join("\n")}\n${parts[1] || ""}`
    await writeFile(memPath, truncateEntrypointContent(updated), "utf-8")
  } else {
    const updated = `${existing}\n\n${marker}\n\n${toAdd.join("\n")}\n`
    await writeFile(memPath, truncateEntrypointContent(updated), "utf-8")
  }
}
```

在 `session.idle` 末尾调用 `syncMemoryFromDaily(base)`。

## 验证

所有修改完成后运行：
```bash
cd /Users/lsygcy1314/Documents/my-project/trip-planner/.opencode && npx -y typescript@latest --noEmit --project tsconfig.json
```
Expected: 无错误输出
