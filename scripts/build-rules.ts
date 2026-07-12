#!/usr/bin/env npx tsx

import fs from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"

const PROJECT_ROOT = process.cwd()

const OUTPUT_FILE = ".opencode/generated/rules.md"
const MANIFEST_FILE = ".opencode/generated/rules-manifest.json"
const MAX_IMPORT_DEPTH = 5

const CORE_FILES = [
  "AGENTS.md",
  "docs/agent-workflow.md",
  "docs/memory/MANAGEMENT.md",
  "docs/memory/AUTO-MEMORY.md",
]

const DYNAMIC_FILES = [
  "docs/memory/MEMORY.md",
  "docs/memory/ACTIVE-CONTEXT.md",
]

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".venv",
  "__pycache__",
  "conversations",
  "daily",
])

interface SourceFile {
  relPath: string
  absPath: string
  content: string
  hash: string
  depth: number
  imports: string[]
}

function readSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8")
  } catch {
    return null
  }
}

function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12)
}

function isTextFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return [".md", ".txt", ".mdx"].includes(ext)
}

function findGitRoot(dir: string): string {
  let current = dir
  while (current !== "/") {
    if (fs.existsSync(path.join(current, ".git"))) return current
    current = path.dirname(current)
  }
  return dir
}

function walkUpForRules(dir: string, maxFiles: number): SourceFile[] {
  const found: SourceFile[] = []
  let current = dir
  const seen = new Set<string>()

  while (current !== "/" && found.length < maxFiles) {
    for (const name of ["AGENTS.md", "CLAUDE.md", "AGENTS.txt"]) {
      const fp = path.join(current, name)
      if (seen.has(fp)) continue
      seen.add(fp)
      if (fs.existsSync(fp)) {
        const content = readSafe(fp)
        if (content) {
          const rel = path.relative(PROJECT_ROOT, fp)
          found.push({
            relPath: rel.startsWith("..") ? fp : rel,
            absPath: fp,
            content,
            hash: contentHash(content),
            depth: 0,
            imports: [],
          })
        }
      }
    }
    current = path.dirname(current)
    if (found.length >= maxFiles) break
  }

  return found
}

function expandImports(
  source: SourceFile,
  allSources: Map<string, SourceFile>,
  depth: number
): string[] {
  if (depth > MAX_IMPORT_DEPTH) return []
  const importedPaths: string[] = []
  const importRegex = /@([^\s@]+\.(?:md|txt|mdx))/g
  let match: RegExpExecArray | null

  while ((match = importRegex.exec(source.content)) !== null) {
    const rawPath = match[1].trim()
    const resolved = resolveImportPath(rawPath, source.absPath)
    if (!resolved) continue
    if (allSources.has(resolved)) continue

    const impContent = readSafe(resolved)
    if (!impContent) {
      console.log(`  ⚠️  @-import 未找到: ${rawPath} (resolved: ${resolved})`)
      continue
    }

    const impSource: SourceFile = {
      relPath: path.relative(PROJECT_ROOT, resolved),
      absPath: resolved,
      content: impContent,
      hash: contentHash(impContent),
      depth,
      imports: [],
    }
    allSources.set(resolved, impSource)
    importedPaths.push(resolved)

    const nested = expandImports(impSource, allSources, depth + 1)
    importedPaths.push(...nested)
  }

  return importedPaths
}

function resolveImportPath(rawPath: string, baseFile: string): string | null {
  let resolved: string | null = null

  if (rawPath.startsWith("~")) {
    const home = process.env.HOME || process.env.USERPROFILE || "/root"
    resolved = path.resolve(home, rawPath.slice(1))
  } else if (path.isAbsolute(rawPath)) {
    resolved = rawPath
  } else {
    resolved = path.resolve(path.dirname(baseFile), rawPath)
  }

  if (fs.existsSync(resolved)) return resolved

  const withMd = resolved + ".md"
  if (fs.existsSync(withMd)) return withMd

  return null
}

function collectConventionFiles(): SourceFile[] {
  const found: SourceFile[] = []
  const seen = new Set<string>()

  const gitRoot = findGitRoot(PROJECT_ROOT)

  for (const base of [PROJECT_ROOT, gitRoot]) {
    const walked = walkUpForRules(base, 3)
    for (const s of walked) {
      if (!seen.has(s.absPath)) {
        seen.add(s.absPath)
        found.push(s)
      }
    }
  }

  const coreSources: SourceFile[] = []
  for (const rel of CORE_FILES) {
    const fp = path.resolve(PROJECT_ROOT, rel)
    if (seen.has(fp)) continue
    seen.add(fp)
    const content = readSafe(fp)
    if (content) {
      coreSources.push({
        relPath: rel,
        absPath: fp,
        content,
        hash: contentHash(content),
        depth: 0,
        imports: [],
      })
    }
  }

  found.push(...coreSources)
  return found
}

function deduplicate(sources: SourceFile[]): SourceFile[] {
  const byHash = new Map<string, SourceFile>()
  for (const s of sources) {
    if (!byHash.has(s.hash) || s.depth < byHash.get(s.hash)!.depth) {
      byHash.set(s.hash, s)
    }
  }
  return [...byHash.values()]
}

function build(): void {
  console.log("📦 构建规则文件（文件系统行走 + @-import）...")
  console.log()

  const genDir = path.resolve(PROJECT_ROOT, ".opencode/generated")
  if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true })

  const collected = collectConventionFiles()
  console.log(`   收集到 ${collected.length} 个源文件`)
  for (const s of collected) {
    console.log(`  ${s.depth > 0 ? "  └─" : "  ✓"} ${s.relPath} (${s.content.split("\n").length} 行)`)
  }

  const allSources = new Map<string, SourceFile>()
  for (const s of collected) {
    allSources.set(s.absPath, s)
  }

  console.log()
  console.log("   🔗 展开 @-import 引用...")
  for (const s of collected) {
    const imported = expandImports(s, allSources, 1)
    if (imported.length > 0) {
      s.imports = imported
      console.log(`     ${s.relPath}: 引用了 ${imported.length} 个文件`)
    }
  }

  const deduped = deduplicate([...allSources.values()])
  console.log(`\n  去重后: ${deduped.length} 个文件`)
  console.log(`  丢弃: ${allSources.size - deduped.length} 个重复`)

  deduped.sort((a, b) => {
    const aIdx = CORE_FILES.indexOf(a.relPath)
    const bIdx = CORE_FILES.indexOf(b.relPath)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1
    return a.relPath.localeCompare(b.relPath)
  })

  let merged = "# 合并规则\n\n"
  merged += `> 生成时间: ${new Date().toISOString().slice(0, 10)}\n`
  merged += `> 源文件: ${deduped.length} 个（${collected.length} 收集 + ${allSources.size - collected.length} @-import）\n`
  merged += `> 总行数: ${deduped.reduce((sum, s) => sum + s.content.split("\n").length, 0)}\n\n`
  merged += "---\n\n"

  for (const source of deduped) {
    merged += `<!-- @from: ${source.relPath} -->\n`
    if (source.imports.length > 0) {
      merged += `<!-- @imports: ${source.imports.map((i) => path.relative(PROJECT_ROOT, i)).join(", ")} -->\n`
    }
    merged += "\n"
    merged += source.content.trimEnd()
    merged += "\n\n---\n\n"
  }

  const outputPath = path.resolve(PROJECT_ROOT, OUTPUT_FILE)
  fs.writeFileSync(outputPath, merged, "utf-8")
  const outputHash = contentHash(merged)

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceCount: deduped.length,
    collectedCount: collected.length,
    importCount: allSources.size - collected.length,
    sources: deduped.map((s) => ({
      file: s.relPath,
      hash: s.hash,
      depth: s.depth,
      imports: s.imports.map((i) => path.relative(PROJECT_ROOT, i)),
    })),
    outputFile: OUTPUT_FILE,
    outputHash,
  }

  fs.writeFileSync(
    path.resolve(PROJECT_ROOT, MANIFEST_FILE),
    JSON.stringify(manifest, null, 2),
    "utf-8"
  )

  const lineCount = merged.split("\n").length
  const byteCount = new TextEncoder().encode(merged).length

  console.log()
  console.log(`✅ 构建完成`)
  console.log(`   输出: ${OUTPUT_FILE}`)
  console.log(`   行数: ${lineCount}`)
  console.log(`   大小: ${(byteCount / 1024).toFixed(1)} KB`)
  console.log()
  console.log(`📋 源文件清单:`)
  for (const s of deduped) {
    const flag = CORE_FILES.includes(s.relPath) ? " (core)" : s.depth > 0 ? " (@import)" : " (convention)"
    console.log(`   ${s.depth > 0 ? "  └─" : "  -"} ${s.relPath}${flag}`)
  }
  console.log()
  console.log(`下一步: ${OUTPUT_FILE} 已就绪，instructions 可以指向此文件`)
}

build()
