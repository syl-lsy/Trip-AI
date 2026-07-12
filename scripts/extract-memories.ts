#!/usr/bin/env npx tsx

import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

const MEMORY_ROOT = "docs/memory"
const INDEX_FILE = "MEMORY.md"
const AUTOMEM_MARKER = "## Auto Memory（AI 自动记录）"

const CATEGORY_KEYWORDS: Record<string, RegExp[]> = {
  decision: [/决定|决策|decided|chose|选.*方案/i],
  preference: [/偏好|喜欢|不喜欢|prefer|倾向于/i],
  bugfix: [/bug|修复|fixed|根因|root.cause|crash|异常|报错/i],
  config: [/配置|端口|port|database|api.*key|环境变量|env/i],
  architecture: [/架构|设计|trade.?off|选型|技术栈|模式|pattern/i],
  lesson: [/教训|经验|lesson|总结|下次|should have/i],
}

interface ExtractionCandidate {
  content: string
  category: string
  sourceFile: string
  confidence: number
}

function readSafe(p: string): string {
  try {
    return fs.readFileSync(p, "utf-8")
  } catch {
    return ""
  }
}

function ensureDir(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function listDailyNotes(): string[] {
  const dir = path.resolve(process.cwd(), MEMORY_ROOT, "daily")
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse()
}

function listConversationLogs(): string[] {
  const dir = path.resolve(process.cwd(), MEMORY_ROOT, "conversations", "active")
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse()
}

function extractCandidatesFromText(
  text: string,
  sourceFile: string
): ExtractionCandidate[] {
  const candidates: ExtractionCandidate[] = []
  const lines = text.split("\n")

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(">")) continue

    for (const [category, patterns] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const pattern of patterns) {
        if (pattern.test(trimmed)) {
          candidates.push({
            content: trimmed.replace(/^- \[?[^\]]*\]?\s*/, "").slice(0, 200),
            category,
            sourceFile,
            confidence: 0.7,
          })
          break
        }
      }
    }
  }

  return candidates
}

function alreadyExists(content: string, memMd: string): boolean {
  return memMd.includes(content.slice(0, 60))
}

function writeToMemory(candidates: ExtractionCandidate[]): void {
  const memPath = path.resolve(process.cwd(), MEMORY_ROOT, INDEX_FILE)
  const existing = readSafe(memPath)
  const newEntries: string[] = []

  for (const c of candidates) {
    if (alreadyExists(c.content, existing)) continue
    const line = `${today()} | ${c.category} | ${c.content}`
    if (newEntries.some((e) => e.includes(c.content.slice(0, 60)))) continue
    newEntries.push(`- ${line}`)
  }

  if (newEntries.length === 0) {
    console.log("  没有新的记忆需要写入（均已存在或重复）")
    return
  }

  if (existing.includes(AUTOMEM_MARKER)) {
    const parts = existing.split(AUTOMEM_MARKER)
    const result = `${parts[0]}${AUTOMEM_MARKER}\n${newEntries.join("\n")}\n${parts[1] || ""}`
    fs.writeFileSync(memPath, result, "utf-8")
  } else {
    fs.appendFileSync(memPath, `\n\n${AUTOMEM_MARKER}\n\n${newEntries.join("\n")}\n`, "utf-8")
  }

  const dailyPath = path.resolve(process.cwd(), MEMORY_ROOT, "daily", `${today()}.md`)
  ensureDir(path.dirname(dailyPath))
  const dailyAppends = newEntries
    .filter((e) => !readSafe(dailyPath).includes(e))
    .join("\n")
  if (dailyAppends) {
    fs.appendFileSync(dailyPath, `\n${dailyAppends}\n`, "utf-8")
  }

  console.log(`  ✓ 写入 ${newEntries.length} 条新记忆`)
  for (const e of newEntries) {
    console.log(`    ${e}`)
  }
}

function matchPattern(text: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[0]
  }
  return null
}

interface Clusters {
  [category: string]: ExtractionCandidate[]
}

function clusterCandidates(candidates: ExtractionCandidate[]): Clusters {
  const clusters: Clusters = {}
  for (const c of candidates) {
    if (!clusters[c.category]) clusters[c.category] = []
    clusters[c.category].push(c)
  }
  return clusters
}

function analyzeDay(dayFile: string): ExtractionCandidate[] {
  const fullPath = path.resolve(process.cwd(), MEMORY_ROOT, "daily", dayFile)
  const content = readSafe(fullPath)
  return extractCandidatesFromText(content, `daily/${dayFile}`)
}

function analyzeConversation(logFile: string): ExtractionCandidate[] {
  const fullPath = path.resolve(process.cwd(), MEMORY_ROOT, "conversations", "active", logFile)
  const content = readSafe(fullPath)
  return extractCandidatesFromText(content, `conversations/active/${logFile}`)
}

function runLLMExtraction(days: number): void {
  const dailyDir = path.resolve(process.cwd(), MEMORY_ROOT, "daily")
  const recentFiles = fs
    .readdirSync(dailyDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse()
    .slice(0, days)

  let context = ""
  for (const f of recentFiles) {
    context += `\n--- ${f} ---\n${readSafe(path.join(dailyDir, f))}\n`
  }

  const prompt = `分析以下对话记录，提取值得永久记住的信息。按以下分类输出：

- [decision] 架构决策、技术选型
- [preference] 用户偏好、风格倾向
- [bugfix] Bug 根因和修复方案
- [config] 关键配置变更
- [architecture] 架构设计决策
- [lesson] 经验教训

只输出有明确记忆价值的内容。每行格式：- YYYY-MM-DD | category | 内容

${context}
`

  const tmpFile = `/tmp/extract-prompt-${Date.now()}.md`
  fs.writeFileSync(tmpFile, prompt, "utf-8")

  try {
    const result = execSync(
      `npx opencode run --file "${tmpFile}" --format json 2>/dev/null`,
      {
        encoding: "utf-8",
        timeout: 120000,
        stdio: ["ignore", "pipe", "pipe"],
      }
    )
    const parsed = JSON.parse(result)
    const responseText = parsed.text || parsed.response || ""
    const lines = responseText.split("\n").filter((l: string) => /^\s*-\s*\d{4}-\d{2}-\d{2}\s*\|/.test(l))

    if (lines.length === 0) {
      console.log("  LLM 未提取到新记忆")
      return
    }

    const memPath = path.resolve(process.cwd(), MEMORY_ROOT, INDEX_FILE)
    const existing = readSafe(memPath)
    const newLines = lines.filter((l: string) => {
      const content = l.replace(/^\s*-\s*/, "").slice(0, 60)
      return !existing.includes(content)
    })

    if (newLines.length === 0) {
      console.log("  所有 LLM 提取结果均已存在")
      return
    }

    if (existing.includes(AUTOMEM_MARKER)) {
      const parts = existing.split(AUTOMEM_MARKER)
      const result = `${parts[0]}${AUTOMEM_MARKER}\n${newLines.join("\n")}\n${parts[1] || ""}`
      fs.writeFileSync(memPath, result, "utf-8")
    } else {
      fs.appendFileSync(memPath, `\n\n${AUTOMEM_MARKER}\n\n${newLines.join("\n")}\n`, "utf-8")
    }

    console.log(`  ✓ LLM 提取写入 ${newLines.length} 条新记忆`)
  } catch (e) {
    console.error("  LLM 提取失败 (opencode run):", (e as Error).message)
    console.log("  回退到规则提取模式")
  } finally {
    try {
      fs.unlinkSync(tmpFile)
    } catch {}
  }
}

function writeMemorySuggestions(
  candidates: ExtractionCandidate[],
  outputPath: string
): void {
  const clusters = clusterCandidates(candidates)
  let output = `# 记忆提取建议\n\n`
  output += `> 自动提取于 ${today()}\n\n`

  for (const [category, items] of Object.entries(clusters)) {
    output += `## ${category}\n\n`
    for (const item of items) {
      output += `- [${item.sourceFile}] ${item.content}\n`
    }
    output += "\n"
  }

  output += `---\n\n运行 --write 将这些写入 MEMORY.md 和 daily note。\n`
  fs.writeFileSync(outputPath, output, "utf-8")
  console.log(`\n📄 建议输出: ${outputPath}`)
}

function main(): void {
  const args = process.argv.slice(2)
  const mode = args.includes("--llm") ? "llm" : args.includes("--write") ? "write" : "suggest"
  const days = (() => {
    const idx = args.indexOf("--days")
    return idx >= 0 && idx + 1 < args.length ? parseInt(args[idx + 1], 10) : 3
  })()

  console.log(`🔍 记忆提取模式: ${mode}`)
  console.log(`   扫描天数: ${days}`)
  console.log()

  if (mode === "llm") {
    runLLMExtraction(days)
    return
  }

  const dailyFiles = listDailyNotes().slice(0, days)
  const convFiles = listConversationLogs().slice(0, 5)

  console.log(`   每日笔记: ${dailyFiles.length} 个文件`)
  console.log(`   对话日志: ${convFiles.length} 个文件`)
  console.log()

  const candidates: ExtractionCandidate[] = []

  for (const f of dailyFiles) {
    const extracted = analyzeDay(f)
    candidates.push(...extracted)
    if (extracted.length > 0) {
      console.log(`  ${f}: ${extracted.length} 条候选`)
    }
  }

  for (const f of convFiles) {
    const extracted = analyzeConversation(f)
    candidates.push(...extracted)
  }

  console.log(`\n📊 共 ${candidates.length} 条候选记忆`)

  const unique = new Map<string, ExtractionCandidate>()
  for (const c of candidates) {
    const key = c.content.slice(0, 60)
    if (!unique.has(key) || unique.get(key)!.confidence < c.confidence) {
      unique.set(key, c)
    }
  }

  const deduped = [...unique.values()]
  console.log(`   去重后: ${deduped.length} 条`)

  if (deduped.length === 0) {
    console.log("\n✅ 没有新的记忆需要提取")
    return
  }

  if (mode === "write") {
    writeToMemory(deduped)
    console.log(`\n✅ 记忆提取完成`)
  } else {
    const outputPath = path.resolve(process.cwd(), "memory-extract-suggestions.md")
    writeMemorySuggestions(deduped, outputPath)
    console.log(`\n使用 --write 写入记忆，或 --llm 使用 LLM 提取模式`)
  }
}

main()
