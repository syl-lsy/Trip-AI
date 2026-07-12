#!/usr/bin/env npx tsx

import fs from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"

const PROJECT_ROOT = process.cwd()

const STATIC_FILES = [
  "docs/agent-workflow.md",
  "docs/memory/MANAGEMENT.md",
  "docs/memory/AUTO-MEMORY.md",
]

const OUTPUT_FILE = ".opencode/generated/static-instructions.md"
const MANIFEST_FILE = ".opencode/generated/manifest.json"
const GITIGNORE_FILE = ".opencode/generated/.gitignore"

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

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function build(): void {
  console.log("📦 构建静态指令文件...")
  console.log()

  const genDir = path.resolve(PROJECT_ROOT, ".opencode/generated")
  ensureDir(genDir)

  const sources: Array<{ file: string; hash: string; content: string }> = []
  let totalBytes = 0

  for (const relPath of STATIC_FILES) {
    const fullPath = path.resolve(PROJECT_ROOT, relPath)
    const content = readSafe(fullPath)

    if (content === null) {
      console.log(`  ⚠️  跳过（不存在）: ${relPath}`)
      continue
    }

    const hash = contentHash(content)
    sources.push({ file: relPath, hash, content })
    totalBytes += new TextEncoder().encode(content).length
    console.log(`  ✓ ${relPath} (${content.split("\n").length} 行, ${hash})`)
  }

  if (sources.length === 0) {
    console.log("\n⚠️  没有找到任何源文件")
    process.exit(1)
  }

  let merged = "# 静态指令 — 自动合并\n\n"
  merged += `> 生成时间: ${new Date().toISOString().slice(0, 10)}\n`
  merged += `> 来源: ${sources.map((s) => s.file).join(", ")}\n`
  merged += `> 总行数: ${sources.reduce((sum, s) => sum + s.content.split("\n").length, 0)}\n\n`
  merged += "---\n\n"

  for (const source of sources) {
    merged += `<!-- @from: ${source.file} -->\n\n`
    merged += source.content.trimEnd()
    merged += "\n\n---\n\n"
  }

  const outputPath = path.resolve(PROJECT_ROOT, OUTPUT_FILE)
  fs.writeFileSync(outputPath, merged, "utf-8")
  const outputHash = contentHash(merged)

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceCount: sources.length,
    sources: sources.map((s) => ({ file: s.file, hash: s.hash })),
    outputFile: OUTPUT_FILE,
    outputHash,
    totalBytes,
  }

  fs.writeFileSync(
    path.resolve(PROJECT_ROOT, MANIFEST_FILE),
    JSON.stringify(manifest, null, 2),
    "utf-8"
  )

  fs.writeFileSync(path.resolve(PROJECT_ROOT, GITIGNORE_FILE), "*\n", "utf-8")

  const lineCount = merged.split("\n").length
  const byteCount = new TextEncoder().encode(merged).length

  console.log()
  console.log(`✅ 合并完成`)
  console.log(`   输出: ${OUTPUT_FILE}`)
  console.log(`   行数: ${lineCount}`)
  console.log(`   大小: ${(byteCount / 1024).toFixed(1)} KB`)
  console.log(`   来源: ${sources.length} 个文件`)
  console.log()
  console.log(`📋 下一步：更新 opencode.json 中的 instructions:`)
  console.log(`   [0] .opencode/generated/static-instructions.md  (静态)`)
  console.log(`   [1] docs/memory/MEMORY.md                      (动态)`)
  console.log(`   [2] docs/memory/ACTIVE-CONTEXT.md              (动态)`)
}

build()
