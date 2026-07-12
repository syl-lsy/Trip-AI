# 记忆系统优化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复记忆系统的 9 个优化点：日志路径混乱、Heartbeat 污染、GC 逻辑 bug、记忆搜索覆盖、跨会话整合、指令强化

**Architecture:** 4 个 Phase 按依赖顺序执行：Phase 1（日志/GC）→ Phase 2（搜索）→ Phase 3（跨会话）→ Phase 4（指令）。Phase 1 和 Phase 2 可并行。

**Tech Stack:** TypeScript Plugin（auto-memory.ts）、shell 脚本、opencode.json 配置

---

## 文件变更总览

| 文件 | 变更类型 | 所属 Phase |
|------|---------|-----------|
| `.opencode/plugins/auto-memory.ts` | 修改 | Phase 1, 2, 3 |
| `docs/memory/MANAGEMENT.md` | 修改 | Phase 1 |
| `docs/memory/heartbeat-state.json` | 修改（自动） | Phase 1 |
| `docs/memory/conversations/` 下 76 个文件 | 归档 → `archives/` | Phase 1 |
| `docs/memory/conversations/archives/2026-07/INDEX.md` | 创建 | Phase 1 |
| `.opencode/opencode.json` | 修改 | Phase 4 |

---

### Task 1: 修复 `gcOldFiles` mtime 逻辑

**Files:**
- Modify: `.opencode/plugins/auto-memory.ts:153-159, 166-186`
- Test: N/A（需手动验证）

**Interfaces:**
- Consumes: Node.js `fs.stat`
- Produces: 正确的 `gcOldFiles` 清理逻辑（基于 mtime）

**背景**：`mtime()` 函数始终返回 0（第 153-159 行），`gcOldFiles` 读取文件内容长度而非 mtime。导致 spillover 和 session 文件永远不会被正确 GC。

- [ ] **Step 1: 修复 `mtime` 和 `gcOldFiles`**

```typescript
// 删除整个 mtime 函数 (lines 153-159)
// 修改 gcOldFiles (lines 166-186):

async function gcOldFiles(dir: string, ttlMs: number, globFilter: (name: string) => boolean): Promise<number> {
  if (!existsSync(dir)) return 0
  const files = await readdir(dir)
  const cutoff = Date.now() - ttlMs
  let removed = 0
  for (const name of files) {
    if (!globFilter(name)) continue
    const fp = join(dir, name)
    try {
      const stat = await readFile(fp, "utf-8").then(() => true).catch(() => false)
      if (!stat) continue
      const stats = await import("node:fs").then(m => m.promises.stat(fp)).catch(() => null)
      if (!stats || stats.mtimeMs < cutoff) {
        await rm(fp)
        removed++
      }
    } catch {
      // silent
    }
  }
  return removed
}
```

关键改动：
1. 删除无用的 `mtime()` 函数
2. `gcOldFiles` 中改用 `fs.promises.stat(fp)` 获取 `mtimeMs`
3. 文件 mtime 超过 TTL 或 stat 失败时删除

- [ ] **Step 2: 验证编译通过**

Run:
```bash
cd .opencode && npx -y typescript@latest --noEmit --project tsconfig.json plugins/auto-memory.ts 2>&1
```
Expected: 无错误输出

---

### Task 2: 去重心跳 auto_flush 历史

**Files:**
- Modify: `.opencode/plugins/auto-memory.ts:331-333`

**Interfaces:**
- Consumes: heartbeat-state.json 结构
- Produces: 去重后的 heartbeat history（同日只保留一条 auto_flush）

- [ ] **Step 1: 修改 heartbeat 写入逻辑**

将原来一直追加的逻辑改为去重：

```typescript
// 替换 lines 331-333:
hb.history = hb.history || []
const lastEntry = hb.history[hb.history.length - 1]
if (!lastEntry || lastEntry.date !== today() || lastEntry.action !== "auto_flush") {
  hb.history.push({ date: today(), action: "auto_flush", detail: "Plugin auto-memory flush" })
}
if (hb.history.length > 50) hb.history = hb.history.slice(-50)
```

- [ ] **Step 2: 验证编译通过**

Run:
```bash
cd .opencode && npx -y typescript@latest --noEmit --project tsconfig.json plugins/auto-memory.ts 2>&1
```
Expected: 无错误输出

---

### Task 3: 修复对话日志写入路径（#1）+ 归档现有文件（#10）

**Files:**
- Modify: `.opencode/plugins/auto-memory.ts`
- Create: （归档 INDEX.md）
- Modify: `docs/memory/MANAGEMENT.md`

**Interfaces:**
- Produces: 对话日志正确写入 `daily/`；现有 76 个文件归档

- [ ] **Step 1: 分析 `conversations/` 下 76 个文件的来源**

Run:
```bash
head -5 /Users/lsygcy1314/Documents/my-project/trip-planner/docs/memory/conversations/2026-07-11T02-19-24.md
```
确认这些文件是由 OpenCode 运行时的上下文捕获机制自动生成的，非 Plugin 写入。

- [ ] **Step 2: 归档现有文件**

Run:
```bash
mkdir -p /Users/lsygcy1314/Documents/my-project/trip-planner/docs/memory/conversations/archives/2026-07
mv /Users/lsygcy1314/Documents/my-project/trip-planner/docs/memory/conversations/2026-07-09*.md /Users/lsygcy1314/Documents/my-project/trip-planner/docs/memory/conversations/archives/2026-07/
mv /Users/lsygcy1314/Documents/my-project/trip-planner/docs/memory/conversations/2026-07-11*.md /Users/lsygcy1314/Documents/my-project/trip-planner/docs/memory/conversations/archives/2026-07/
```

创建 INDEX.md：

```markdown
# 2026-07 对话归档

归档日期：2026-07-11

| 原始文件 | 会话日期 | 说明 |
|---------|---------|------|
| 2026-07-09T*.md | 2026-07-09 | 历史会话日志 |
| 2026-07-11T*.md | 2026-07-11 | 记忆系统升级会话 |
```

- [ ] **Step 3: 更新 MANAGEMENT.md 明确日志路径规则**

在"目录结构"一节更新路径说明，区分 OpenCode 自动日志和 Plugin 管理的内容：

```markdown
conversations/         # OpenCode 运行时自动生成的对话日志（按日期散列）
├── active/            # 最近 5 条活跃会话（由 MANAGEMENT.md 归档规则管理）
├── archives/          # 按月归档
└── sessions/          # Plugin session 摘要（auto-memory.ts 管理）
```

---

### Task 4: `memory_search` 段落级分块（#6）

**Files:**
- Modify: `.opencode/plugins/auto-memory.ts:399-442`

- [ ] **Step 1: 将文档单元从单行改为段落级**

```typescript
// 替换第 399-442 行的 allDocs 构建逻辑
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

所有 `allDocs` 构建循环改为遍历段落而非单行：

```typescript
// MEMORY.md
const memParagraphs = extractParagraphs(memLines)
for (const p of memParagraphs) {
  allDocs.push({ text: p.text, file: INDEX_FILE, line: p.startLine })
}

// daily notes - 同样改为段落级
// topic files - 同样改为段落级
```

- [ ] **Step 2: 验证编译通过**

Run:
```bash
cd .opencode && npx -y typescript@latest --noEmit --project tsconfig.json plugins/auto-memory.ts 2>&1
```
Expected: 无错误输出

---

### Task 5: `memory_search` 桥接 context-mode（#5）

**Files:**
- Modify: `.opencode/plugins/auto-memory.ts:385-389`

- [ ] **Step 1: 在 `memory_search` 中增加 ctx_search 结果合并**

在 BM25 搜索完成后、排序前，插入 context-mode 查询：

```typescript
// 在 BM25 results 排序前 (line ~508)
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
      score: 0.5 / (i + 1), // 降序加权
      description: "",
      type: "",
    })) : []
  } catch {
    return []
  }
}

// 在 BM25 结果后追加 context-mode 结果
const ctxResults = await queryContextMode(q, args.max_results)
results.push(...ctxResults)
```

- [ ] **Step 2: 验证编译通过**

Run:
```bash
cd .opencode && npx -y typescript@latest --noEmit --project tsconfig.json plugins/auto-memory.ts 2>&1
```
Expected: 无错误输出

---

### Task 6: 跨会话知识整合（#7）

**Files:**
- Modify: `.opencode/plugins/auto-memory.ts`

- [ ] **Step 1: 在 `session.idle` 中增加跨 session 对比逻辑**

在 `session.idle` 事件的末尾部分增加：

```typescript
// 跨 session 知识整合
async function consolidateCrossSession(base: string): Promise<void> {
  const sDir = sessionsDir(base)
  if (!existsSync(sDir)) return
  const files = await readdir(sDir)
  const mdFiles = files.filter((f: string) => f.endsWith(".md")).sort().reverse()
  if (mdFiles.length < 3) return // 至少 3 个 session 才有整合意义

  const recent: string[] = []
  for (const f of mdFiles.slice(0, 3)) {
    const content = await readSafe(join(sDir, f))
    const decisionMatch = content.match(/## 决策\n\n([\s\S]*?)(?=\n## |$)/)
    if (decisionMatch) recent.push(decisionMatch[1])
  }

  // 查找跨 session 共性模式（简单去重统计）
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
    // 去重追加
    const toAdd = lines.filter(l => !existing.includes(l.slice(0, 60)))
    if (toAdd.length > 0) {
      const parts = existing.includes(marker) ? existing.split(marker) : [existing, ""]
      const updated = `${parts[0]}${marker}\n${toAdd.join("\n")}\n${parts[1] || ""}`
      await writeFile(memPath, truncateEntrypointContent(updated), "utf-8")
    }
  }
}
```

在 `session.idle` 末尾调用 `consolidateCrossSession(base)`。

- [ ] **Step 2: 验证编译通过**

Run:
```bash
cd .opencode && npx -y typescript@latest --noEmit --project tsconfig.json plugins/auto-memory.ts 2>&1
```
Expected: 无错误输出

---

### Task 7: MEMORY.md 自动更新（#8）

**Files:**
- Modify: `.opencode/plugins/auto-memory.ts`

- [ ] **Step 1: 在 `session.idle` 中增加 MEMORY.md 同步逻辑**

```typescript
// MEMORY.md 自动更新
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

- [ ] **Step 2: 验证编译通过**

Run:
```bash
cd .opencode && npx -y typescript@latest --noEmit --project tsconfig.json plugins/auto-memory.ts 2>&1
```
Expected: 无错误输出

---

### Task 8: instructions 指令强化（#9）

**Files:**
- Modify: `.opencode/opencode.json:5-8`

- [ ] **Step 1: 在 `instructions` 数组最前面追加检索链指令**

```json
{
  "instructions": [
    "### 回复前强制检索链\n每次回复用户前，必须依次读取以下记忆文件：\n1. docs/memory/ACTIVE-CONTEXT.md — 当前会话状态\n2. docs/memory/MEMORY.md — 长期架构决策\n3. docs/memory/daily/$(date +%Y-%m-%d).md — 今日事件",
    ".opencode/generated/rules.md",
    "docs/memory/MEMORY.md",
    "docs/memory/ACTIVE-CONTEXT.md"
  ]
}
```

- [ ] **Step 2: 验证 JSON 格式**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('.opencode/opencode.json','utf8'))" && echo "valid JSON"
```
Expected: `valid JSON`

---

### Task 9: 验证与清理

- [ ] **Step 1: 编译验证所有 TypeScript 变更**

Run:
```bash
cd .opencode && npx -y typescript@latest --noEmit --project tsconfig.json plugins/auto-memory.ts 2>&1
```

- [ ] **Step 2: 验证 conversations/ 归档结果**

Run:
```bash
ls /Users/lsygcy1314/Documents/my-project/trip-planner/docs/memory/conversations/*.md 2>/dev/null | wc -l
echo "---"
ls /Users/lsygcy1314/Documents/my-project/trip-planner/docs/memory/conversations/active/*.md 2>/dev/null | wc -l
echo "---"
ls /Users/lsygcy1314/Documents/my-project/trip-planner/docs/memory/conversations/archives/2026-07/*.md 2>/dev/null | wc -l
```
Expected: conversations/ 根目录 0 个散落文件，active/ + archives/ 各有合理数量

- [ ] **Step 3: 写入记忆**

```text
2026-07-11 | enhancement | 记忆系统 9 项优化完成（日志路径/GC/搜索/跨会话整合/指令强化） | 详见 docs/superpowers/plans/2026-07-11-memory-system-optimization.md
```
