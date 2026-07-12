import { type Plugin, tool } from '@opencode-ai/plugin'
import { readFile, writeFile, appendFile, mkdir, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const MEMORY_ROOT = 'docs/memory'
const INDEX_FILE = 'MEMORY.md'
const ACTIVE_FILE = 'ACTIVE-CONTEXT.md'
const HEARTBEAT_FILE = 'heartbeat-state.json'
const SPILLOVER_LIMIT = 8192
const SPILLOVER_TTL_MS = 24 * 60 * 60 * 1000
const SESSION_TTL_MS = 24 * 60 * 60 * 1000
const ARCHIVE_TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 days for cold archive GC
const DAILY_ARCHIVE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days for daily notes archive

const MAX_ENTRYPOINT_LINES = 200
const MAX_ENTRYPOINT_BYTES = 25000

const BM25_K1 = 1.5
const BM25_B = 0.75

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function now(): string {
  return new Date().toISOString()
}

async function readSafe(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return ''
  }
}

async function ensureDir(path: string): Promise<void> {
  if (!existsSync(path)) await mkdir(path, { recursive: true })
}

async function ensureDailyNote(base: string): Promise<string> {
  const dir = join(base, 'daily')
  await ensureDir(dir)
  const path = join(dir, `${today()}.md`)
  if (!existsSync(path)) {
    await writeFile(path, `# ${today()} 每日笔记\n\n`, 'utf-8')
  }
  return path
}

async function appendToDaily(base: string, line: string): Promise<void> {
  const path = await ensureDailyNote(base)
  const content = await readSafe(path)
  if (content.includes(line)) return
  await appendFile(path, `${line}\n`, 'utf-8')
}

function spilloverDir(base: string): string {
  return join(base, 'spillover')
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;:.!?()\[\]{}=+\\/'"<>@#|&*^%~`$-]+/)
    .filter((t) => t.length > 1)
}

function computeBM25(
  queryTokens: string[],
  docTokens: string[],
  avgDocLen: number,
  totalDocs: number,
  docsContainingTerm: Map<string, number>,
): number {
  const docLen = docTokens.length
  let score = 0
  for (const qt of queryTokens) {
    const tf = docTokens.filter((t) => t === qt).length
    if (tf === 0) continue
    const df = docsContainingTerm.get(qt) || 1
    const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5))
    const numerator = tf * (BM25_K1 + 1)
    const denominator = tf + BM25_K1 * (1 - BM25_B + BM25_B * (docLen / avgDocLen))
    score += idf * (numerator / denominator)
  }
  return score
}

function extractFrontmatter(text: string): { description: string; type: string } {
  const match = text.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return { description: '', type: '' }
  const frontmatter = match[1]
  const desc = frontmatter.match(/^description:\s*(.+)$/m)?.[1] || ''
  const type = frontmatter.match(/^type:\s*(.+)$/m)?.[1] || ''
  return { description: desc, type: type }
}

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'need',
  'dare',
  'ought',
  'used',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'as',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'out',
  'off',
  'over',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'and',
  'but',
  'or',
  'if',
  'while',
  'that',
  'this',
  'these',
  'those',
  'it',
  'its',
  'i',
  'me',
  'my',
  'we',
  'our',
  'you',
  'your',
  'he',
  'she',
  'they',
  'them',
  'their',
  'what',
  'which',
  'who',
  'whom',
])

function isStopword(word: string): boolean {
  return STOPWORDS.has(word) || /^\d+$/.test(word)
}

function truncateEntrypointContent(raw: string): string {
  let lines = raw.split('\n')
  if (lines.length > MAX_ENTRYPOINT_LINES) {
    const kept = lines.slice(0, MAX_ENTRYPOINT_LINES)
    kept.push('')
    kept.push(`<!-- truncation: exceeded ${MAX_ENTRYPOINT_LINES} line limit -->`)
    lines = kept
  }
  let content = lines.join('\n')
  const encoder = new TextEncoder()
  while (encoder.encode(content).length > MAX_ENTRYPOINT_BYTES && lines.length > 10) {
    lines.splice(-2, 0, '')
    lines[lines.length - 1] = `<!-- truncation: exceeded ${MAX_ENTRYPOINT_BYTES} byte limit -->`
    content = lines.join('\n')
  }
  return content
}

interface SearchResult {
  file: string
  line: number
  content: string
  score: number
  description: string
  type: string
  frontmatter?: string
}

function sessionsDir(base: string): string {
  return join(base, 'sessions')
}

function sessionSummaryFile(base: string, sessionId: string): string {
  return join(sessionsDir(base), `${sessionId}.md`)
}

function archiveDir(base: string): string {
  return join(base, 'conversations', 'archives')
}

function extractParagraphs(lines: string[]): { text: string; startLine: number }[] {
  const paragraphs: { text: string; startLine: number }[] = []
  let current: string[] = []
  let startLine = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim() || line.startsWith('#') || line.startsWith('<!--') || line.startsWith('---')) {
      if (current.length > 0) {
        paragraphs.push({ text: current.join(' ').trim(), startLine })
        current = []
      }
      if (line.startsWith('## ') || line.startsWith('# ')) startLine = i + 1
      continue
    }
    if (current.length === 0) startLine = i + 1
    current.push(line.trim())
  }
  if (current.length > 0) paragraphs.push({ text: current.join(' ').trim(), startLine })
  return paragraphs
}

async function queryContextMode(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const { execSync } = await import('child_process')
    const result = execSync(
      `opencode run --json --prompt "ctx_search(queries: [${JSON.stringify(query)}], limit: ${maxResults})"`,
      { encoding: 'utf-8' as const, timeout: 10000 },
    )
    const parsed = JSON.parse(result as string)
    return Array.isArray(parsed)
      ? parsed.slice(0, maxResults).map((r: any, i: number) => ({
          file: r.source || 'context-mode',
          line: r.line || 0,
          content: r.text || JSON.stringify(r),
          score: 0.5 / (i + 1),
          description: '',
          type: '',
        }))
      : []
  } catch {
    return []
  }
}

async function consolidateCrossSession(base: string): Promise<void> {
  const sDir = sessionsDir(base)
  if (!existsSync(sDir)) return
  const files = await readdir(sDir)
  const mdFiles = files
    .filter((f: string) => f.endsWith('.md'))
    .sort()
    .reverse()
  if (mdFiles.length < 3) return

  const recent: string[] = []
  for (const f of mdFiles.slice(0, 3)) {
    const content = await readSafe(join(sDir, f))
    const decisionMatch = content.match(/## 决策\n\n([\s\S]*?)(?=\n## |$)/)
    if (decisionMatch) recent.push(decisionMatch[1])
  }

  const allDecisions = recent
    .join('\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const common: string[] = []
  for (const d of allDecisions) {
    const key = d.replace(/^- /, '').trim()
    if (seen.has(key)) common.push(d)
    seen.add(key)
  }

  if (common.length > 0) {
    const memPath = join(base, INDEX_FILE)
    const existing = await readSafe(memPath)
    const marker = '## Auto Memory（AI 自动记录）'
    const lines = common.map((d) => `- ${today()} | cross-session | ${d.replace(/^- /, '')}`)
    const toAdd = lines.filter((l) => !existing.includes(l.slice(0, 60)))
    if (toAdd.length > 0) {
      const parts = existing.includes(marker) ? existing.split(marker) : [existing, '']
      const updated = `${parts[0]}${marker}\n${toAdd.join('\n')}\n${parts[1] || ''}`
      await writeFile(memPath, truncateEntrypointContent(updated), 'utf-8')
    }
  }
}

async function syncMemoryFromDaily(base: string): Promise<void> {
  const todayPath = join(base, 'daily', `${today()}.md`)
  if (!existsSync(todayPath)) return

  const content = await readSafe(todayPath)
  const decisionLines = content
    .split('\n')
    .filter((l) => /^- \[?(?:决策|decision|arch|架构|决定|选择)\]?/i.test(l))

  if (decisionLines.length === 0) return

  const memPath = join(base, INDEX_FILE)
  const existing = await readSafe(memPath)
  const marker = '## Auto Memory（AI 自动记录）'

  const lines = decisionLines.map((l) => {
    const clean = l.replace(/^- \[?(?:决策|decision|arch|架构|决定|选择)\]?\s*/i, '')
    return `- ${today()} | decision | ${clean}`
  })

  const toAdd = lines.filter((l) => !existing.includes(l.slice(0, 60)))
  if (toAdd.length === 0) return

  if (existing.includes(marker)) {
    const parts = existing.split(marker)
    const updated = `${parts[0]}${marker}\n${toAdd.join('\n')}\n${parts[1] || ''}`
    await writeFile(memPath, truncateEntrypointContent(updated), 'utf-8')
  } else {
    const updated = `${existing}\n\n${marker}\n\n${toAdd.join('\n')}\n`
    await writeFile(memPath, truncateEntrypointContent(updated), 'utf-8')
  }
}

let latestSessionId = ''

export default (async ({ client, directory }) => {
  const base = resolve(directory, MEMORY_ROOT)

  async function gcOldFiles(
    dir: string,
    ttlMs: number,
    globFilter: (name: string) => boolean,
  ): Promise<number> {
    if (!existsSync(dir)) return 0
    const files = await readdir(dir)
    const cutoff = Date.now() - ttlMs
    let removed = 0
    for (const name of files) {
      if (!globFilter(name)) continue
      const fp = join(dir, name)
      try {
        const { stat } = await import('node:fs/promises')
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

  async function gcOldDailyNotes(base: string): Promise<number> {
    const dailyDir = join(base, 'daily')
    if (!existsSync(dailyDir)) return 0
    const files = await readdir(dailyDir)
    const cutoff = Date.now() - DAILY_ARCHIVE_TTL_MS
    const archiveDir = join(base, 'daily-archives')
    await ensureDir(archiveDir)
    let archived = 0

    for (const name of files) {
      if (!name.endsWith('.md')) continue
      const dateMatch = name.match(/^(\d{4}-\d{2}-\d{2})\.md$/)
      if (!dateMatch) continue

      const fileDate = new Date(dateMatch[1])
      if (isNaN(fileDate.getTime())) continue
      if (fileDate.getTime() > cutoff) continue

      const fp = join(dailyDir, name)
      try {
        const content = await readFile(fp, 'utf-8')
        const keyLines = content
          .split('\n')
          .filter((l) => /^- \[(?:decision|config|bugfix|lesson|architecture|preference)\]/.test(l))
          .join('\n')

        const monthKey = dateMatch[1].slice(0, 7)
        const archivePath = join(archiveDir, `${monthKey}.md`)
        const archiveEntry = `\n## ${dateMatch[1]}\n\n${keyLines}\n`
        await appendFile(archivePath, archiveEntry, 'utf-8')
        await rm(fp)
        archived++
      } catch {
        // skip file on error
      }
    }
    return archived
  }

  async function loadLatestSessionSummary(): Promise<string> {
    const sDir = sessionsDir(base)
    if (!existsSync(sDir)) return ''
    const files = await readdir(sDir).catch(() => [] as string[])
    const mdFiles = files
      .filter((f: string) => f.endsWith('.md'))
      .sort()
      .reverse()
    if (mdFiles.length === 0) return ''
    return await readSafe(join(sDir, mdFiles[0]))
  }

  return {
    'experimental.session.compacting': async (_input, output) => {
      const [memory, active, sessionSummary] = await Promise.all([
        readSafe(join(base, INDEX_FILE)),
        readSafe(join(base, ACTIVE_FILE)),
        loadLatestSessionSummary(),
      ])

      if (memory) output.context.push(`## MEMORY.md\n\n${memory}`)
      if (active) output.context.push(`## ACTIVE-CONTEXT.md\n\n${active}`)
      if (sessionSummary) output.context.push(`## 当前会话摘要\n\n${sessionSummary}`)

      const todayPath = await ensureDailyNote(base)
      const todayContent = await readSafe(todayPath)
      const decisionLines = todayContent
        .split('\n')
        .filter((l) => /^- \[?(?:决策|decision|arch|架构)\]?/i.test(l))
      if (decisionLines.length > 0) {
        output.context.push(`## 今日决策\n\n${decisionLines.join('\n')}`)
      }
    },

    'tool.execute.after': async (input) => {
      if (['edit', 'write', 'patch'].includes(input.tool)) {
        const path = input.args?.filePath || 'unknown'
        await appendToDaily(base, `- 修改: ${path}`)
      }
      if (input.tool === 'bash') {
        const cmd: string = input.args?.command || ''
        if (/(test|pnpm\s+(test|lint|typecheck|check|run test))/.test(cmd)) {
          await appendToDaily(base, `- 运行: ${cmd.slice(0, 80)}`)
        }
      }

      const outputStr: string = (input as any).output || ''
      if (
        ['bash', 'read'].includes(input.tool) &&
        new TextEncoder().encode(outputStr).length > SPILLOVER_LIMIT
      ) {
        const spillDir = spilloverDir(base)
        await ensureDir(spillDir)
        const ts = Date.now()
        const toolName = input.tool
        const name = `${ts}-${toolName}.txt`
        await writeFile(join(spillDir, name), outputStr.slice(0, 100_000), 'utf-8').catch(() => {})
      }
    },

    event: async ({ event }) => {
      if (event.type === 'session.created') {
        await ensureDailyNote(base)

        const sessionId = (event as any).properties?.sessionID as string | undefined
        if (sessionId) {
          latestSessionId = sessionId
          const sDir = sessionsDir(base)
          await ensureDir(sDir)
          const summaryPath = sessionSummaryFile(base, sessionId)
          if (!existsSync(summaryPath)) {
            await writeFile(
              summaryPath,
              `# 会话摘要 (${now().slice(0, 10)})\n\n## 任务\n\n## 文件\n\n## 决策\n\n## 下一步\n`,
              'utf-8',
            )
          }
        }
        return
      }

      if (event.type !== 'session.idle') return

      const sid = (event as any).properties?.sessionID as string | undefined
      if (sid) {
        latestSessionId = sid
        try {
          const [sessionRes, messagesRes] = await Promise.all([
            (client as any).session.get({ path: { id: sid } }).catch(() => null),
            (client as any).session.messages({ path: { id: sid } }).catch(() => null),
          ])

          const title = sessionRes?.data?.title || 'untitled'
          const msgs = messagesRes?.data || []
          const recent = msgs.slice(-4)
          const summary = recent
            .map((m: any) => {
              const role = m.info?.role || 'unknown'
              const text =
                m.parts
                  ?.filter((p: any) => p.type === 'text')
                  .map((p: any) => p.text)
                  .join(' ')
                  .slice(0, 500) || ''
              return text ? `> ${role}: ${text}` : ''
            })
            .filter(Boolean)
            .join('\n\n')

          if (summary) {
            await appendToDaily(base, `\n### ${title}\n\n${summary}\n`)
          }
        } catch {
          // SDK not available
        }
      }

      try {
        await gcOldFiles(spilloverDir(base), SPILLOVER_TTL_MS, (name: string) =>
          name.endsWith('.txt'),
        )
      } catch {
        // silent
      }

      try {
        await gcOldFiles(sessionsDir(base), SESSION_TTL_MS, (name: string) => name.endsWith('.md'))
      } catch {
        // silent
      }

      try {
        await gcOldFiles(
          archiveDir(base),
          ARCHIVE_TTL_MS,
          (name: string) => name.endsWith('.md') && name !== 'INDEX.md',
        )
      } catch {
        // silent
      }

      try {
        const hbPath = join(base, HEARTBEAT_FILE)
        const raw = await readSafe(hbPath)
        const hb = raw
          ? JSON.parse(raw)
          : {
              version: 1,
              last_maintenance: '',
              sizes: {},
              scheduled: { next_weekly_review: '', next_quarterly_archive: '' },
              history: [],
            }

        hb.last_maintenance = today()

        const [memoryMd, activeMd] = await Promise.all([
          readSafe(join(base, INDEX_FILE)),
          readSafe(join(base, ACTIVE_FILE)),
        ])
        hb.sizes = {
          active_context_lines: activeMd.split('\n').filter(Boolean).length,
          memory_md_lines: memoryMd.split('\n').filter(Boolean).length,
          daily_notes_count: (await readdir(join(base, 'daily'))).filter((f: string) =>
            f.endsWith('.md'),
          ).length,
          topic_files_count: (
            await readdir(join(base, 'topics')).catch(() => [] as string[])
          ).filter((f: string) => f.endsWith('.md')).length,
          active_logs_count: (
            await readdir(join(base, 'conversations', 'active')).catch(() => [] as string[])
          ).filter((f: string) => f.endsWith('.md')).length,
        }

        hb.history = hb.history || []
        const lastEntry = hb.history[hb.history.length - 1]
        if (!lastEntry || lastEntry.date !== today() || lastEntry.action !== 'auto_flush') {
          hb.history.push({
            date: today(),
            action: 'auto_flush',
            detail: 'Plugin auto-memory flush',
          })
        }
        if (hb.history.length > 50) hb.history = hb.history.slice(-50)

        await writeFile(hbPath, JSON.stringify(hb, null, 2), 'utf-8')
      } catch {
        // silent
      }

      try {
        await consolidateCrossSession(base)
      } catch {
        // silent
      }

      try {
        await syncMemoryFromDaily(base)
      } catch {
        // silent
      }

      try {
        const archived = await gcOldDailyNotes(base)
        if (archived > 0) {
          await appendToDaily(base, `- 归档: ${archived} 篇旧每日笔记`)
        }
      } catch {
        // silent
      }
    },

    tool: {
      memory_write: tool({
        description:
          'Write an important fact, decision, or lesson to long-term memory with automatic deduplication',
        args: {
          content: tool.schema
            .string()
            .describe('What to remember — a concise fact, decision, or lesson'),
          category: tool.schema
            .enum(['decision', 'preference', 'bugfix', 'config', 'architecture', 'lesson'])
            .describe('Category of memory'),
        },
        async execute(args) {
          const line = `${today()} | ${args.category} | ${args.content}`
          const memPath = join(base, INDEX_FILE)
          const existing = await readSafe(memPath)

          for (const l of existing.split('\n')) {
            if (l.includes(args.content.slice(0, 60)))
              return `Skipped — already exists: ${l.trim()}`
          }

          const marker = '## Auto Memory（AI 自动记录）'
          if (existing.includes(marker)) {
            const parts = existing.split(marker)
            const result = `${parts[0]}${marker}\n- ${line}\n${parts[1] || ''}`
            await writeFile(memPath, truncateEntrypointContent(result), 'utf-8')
          } else {
            const result = `${existing}\n\n${marker}\n\n- ${line}\n`
            await writeFile(memPath, truncateEntrypointContent(result), 'utf-8')
          }

          await appendToDaily(base, `- [${args.category}] ${args.content}`)
          return `Written to MEMORY.md and daily note: ${line}`
        },
      }),

      memory_search: tool({
        description:
          "Search across project memory files (MEMORY.md, daily notes, topic files). Use 'semantic' mode for BM25-ranked results with richer context for LLM relevance judgment.",
        args: {
          query: tool.schema.string().describe('Keywords to search for in memory files'),
          max_results: tool.schema
            .number()
            .optional()
            .default(5)
            .describe('Maximum number of results (default 5)'),
          mode: tool.schema
            .enum(['precise', 'semantic'])
            .optional()
            .default('semantic')
            .describe(
              "'precise' = substring match (fast), 'semantic' = BM25 ranking + full metadata (default)",
            ),
        },
        async execute(args) {
          const q = args.query.toLowerCase()
          const queryTokens = tokenize(q).filter((t) => !isStopword(t))
          const mode = args.mode || 'semantic'
          const results: SearchResult[] = []
          let totalDocs = 0
          const docsContainingTerm = new Map<string, number>()

          interface DocLine {
            text: string
            file: string
            line: number
            frontmatter?: string
          }
          const allDocs: DocLine[] = []

          const memContent = await readSafe(join(base, INDEX_FILE))
          const memLines = memContent.split('\n')
          const memParagraphs = extractParagraphs(memLines)
          for (const p of memParagraphs) {
            allDocs.push({ text: p.text, file: INDEX_FILE, line: p.startLine })
          }

          const dailyDir = join(base, 'daily')
          if (existsSync(dailyDir)) {
            const files = await readdir(dailyDir)
            const recent = files.filter((f: string) => f.endsWith('.md')).slice(-14)
            for (const file of recent) {
              const content = await readSafe(join(dailyDir, file))
              const sectionLines = content.split('\n')
              const dailyParagraphs = extractParagraphs(sectionLines)
              for (const p of dailyParagraphs) {
                allDocs.push({
                  text: p.text,
                  file: `daily/${file}`,
                  line: p.startLine,
                  frontmatter: content.slice(0, 500),
                })
              }
            }
          }

          const topicsDir = join(base, 'topics')
          if (existsSync(topicsDir)) {
            const files = await readdir(topicsDir).catch(() => [] as string[])
            for (const file of files.filter((f: string) => f.endsWith('.md'))) {
              const content = await readSafe(join(topicsDir, file))
              const fm = extractFrontmatter(content)
              const topicLines = content.split('\n')
              const topicParagraphs = extractParagraphs(topicLines)
              for (const p of topicParagraphs) {
                allDocs.push({
                  text: p.text,
                  file: `topics/${file}`,
                  line: p.startLine,
                  frontmatter:
                    fm.description || fm.type
                      ? `desc: "${fm.description}", type: "${fm.type}"`
                      : undefined,
                })
              }
            }
          }

          totalDocs = allDocs.length

          if (mode === 'precise') {
            for (const doc of allDocs) {
              if (doc.text.toLowerCase().includes(q)) {
                results.push({
                  file: doc.file,
                  line: doc.line,
                  content: doc.text.trim(),
                  score: 1,
                  description: '',
                  type: '',
                  frontmatter: doc.frontmatter,
                })
              }
            }
          } else {
            const allTokens = allDocs.map((d) => tokenize(d.text))
            for (const tokens of allTokens) {
              const seen = new Set<string>()
              for (const t of tokens) {
                if (!seen.has(t)) {
                  seen.add(t)
                  docsContainingTerm.set(t, (docsContainingTerm.get(t) || 0) + 1)
                }
              }
            }

            const avgDocLen =
              allTokens.reduce((sum, t) => sum + t.length, 0) / Math.max(totalDocs, 1)

            for (let i = 0; i < allDocs.length; i++) {
              const doc = allDocs[i]
              const tokens = allTokens[i]
              const score = computeBM25(
                queryTokens,
                tokens,
                avgDocLen,
                totalDocs,
                docsContainingTerm,
              )
              if (score > 0) {
                results.push({
                  file: doc.file,
                  line: doc.line,
                  content: doc.text.trim(),
                  score,
                  description: doc.text.slice(0, 100),
                  type: doc.text.includes('|') ? doc.text.split('|')[1]?.trim() || '' : '',
                  frontmatter: doc.frontmatter,
                })
              }
            }

            if (results.length === 0) {
              for (const doc of allDocs) {
                if (doc.text.toLowerCase().includes(q)) {
                  results.push({
                    file: doc.file,
                    line: doc.line,
                    content: doc.text.trim(),
                    score: 0.1,
                    description: doc.text.slice(0, 100),
                    type: '',
                    frontmatter: doc.frontmatter,
                  })
                }
              }
            }

            const ctxResults = await queryContextMode(q, args.max_results)
            results.push(...ctxResults)

            results.sort((a, b) => b.score - a.score)
          }

          const limited = results.slice(0, args.max_results)

          if (limited.length === 0) return 'No results found.'

          const lines = limited.map((r) => {
            let entry = `[${r.file}:${r.line}] (score: ${r.score.toFixed(3)}) ${r.content}`
            if (r.frontmatter) {
              entry += `\n  └─ metadata: ${r.frontmatter}`
            }
            return entry
          })

          const usage =
            mode === 'semantic'
              ? `\n\nTip: Results ranked by BM25 relevance. Pass specific technical terms for best matches. If results seem off, try mode="precise" for exact substring matching.`
              : ''

          return lines.join('\n') + usage
        },
      }),

      session_update: tool({
        description:
          'Update current session summary (task description, files, decisions, next steps). Survives compaction and resume.',
        args: {
          section: tool.schema
            .enum(['task', 'files', 'decision', 'next'])
            .describe('Section to update: task=任务, files=文件, decision=决策, next=下一步'),
          content: tool.schema
            .string()
            .describe('Content for the section (plain text or bullet list)'),
        },
        async execute(args) {
          const sessionId = latestSessionId
          if (!sessionId) return 'Error: no active session'

          const summaryPath = sessionSummaryFile(base, sessionId)
          await ensureDir(sessionsDir(base))

          let existing = await readSafe(summaryPath)
          if (!existing) {
            existing = `# 会话摘要 (${now().slice(0, 10)})\n\n## 任务\n\n## 文件\n\n## 决策\n\n## 下一步\n`
          }

          const sectionMap: Record<string, string> = {
            task: '## 任务',
            files: '## 文件',
            decision: '## 决策',
            next: '## 下一步',
          }

          const header = sectionMap[args.section]
          if (!header) return `Error: unknown section '${args.section}'`

          const pattern = new RegExp(`(${header}\\n\\n)(?:.|\\n)*?(?=\\n## |$)`)
          if (pattern.test(existing)) {
            existing = existing.replace(pattern, `$1${args.content}\n`)
          } else {
            existing += `\n${header}\n\n${args.content}\n`
          }

          await writeFile(summaryPath, existing, 'utf-8')
          return `Session summary '${args.section}' updated.`
        },
      }),

      spillover_list: tool({
        description:
          'List recent spillover files (large tool outputs saved to disk for reference).',
        args: {
          limit: tool.schema
            .number()
            .optional()
            .default(10)
            .describe('Max files to list (default 10)'),
          tool_filter: tool.schema
            .string()
            .optional()
            .describe("Filter by tool name, e.g. 'bash' or 'read'"),
        },
        async execute(args) {
          const spillDir = spilloverDir(base)
          if (!existsSync(spillDir)) return 'No spillover files.'

          const files = await readdir(spillDir)
          let mdFiles = files.filter((f: string) => f.endsWith('.txt'))

          if (args.tool_filter) {
            mdFiles = mdFiles.filter((f: string) => f.includes(`-${args.tool_filter}.`))
          }

          mdFiles.sort().reverse()
          const limited = mdFiles.slice(0, args.limit)

          if (limited.length === 0) return 'No matching spillover files.'

          const lines = limited.map((name) => {
            const parts = name.split('-')
            const ts = new Date(parseInt(parts[0], 10))
            const tool = (parts[1] || 'unknown').replace('.txt', '')
            return `  ${name}  (${tool}, ${ts.toISOString().slice(0, 19)})`
          })

          return `Spillover files (${limited.length} shown):\n${lines.join('\n')}\n\nUse spillover_read to view a file.`
        },
      }),

      spillover_read: tool({
        description:
          'Read the full content of a specific spillover file (use spillover_list to find filenames).',
        args: {
          filename: tool.schema.string().describe('Filename from spillover_list output'),
        },
        async execute(args) {
          const spillDir = spilloverDir(base)
          const filePath = join(spillDir, args.filename)

          if (!filePath.startsWith(spillDir)) return 'Error: invalid path'
          if (!existsSync(filePath)) return `File not found: ${args.filename}`

          const content = await readSafe(filePath)
          const lines = content.split('\n').length
          const bytes = new TextEncoder().encode(content).length

          return `=== ${args.filename} (${lines} lines, ${(bytes / 1024).toFixed(1)} KB) ===\n\n${content.slice(0, 50000)}`
        },
      }),
    },
  }
}) satisfies Plugin
