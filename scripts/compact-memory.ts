#!/usr/bin/env npx tsx

import fs from 'node:fs'
import path from 'node:path'

interface MemoryRecord {
  id?: number | string
  content: string
  created_at?: string
  metadata?: {
    tier?: string
    namespace?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface MergedResult {
  content: string
  metadata: {
    tier: string
    namespace: string
    merged_from: number
    time_range: string
    group: string
  }
}

interface Clusters {
  [groupName: string]: { items: MemoryRecord[] }
}

const KEYWORD_GROUPS: Record<string, string[]> = {
  architecture: ['架构', '设计', 'trade-off', '方案选型', '数据库', '表结构', '技术栈', '框架'],
  preference: ['偏好', '喜欢', '风格', '习惯', '命名', '命名约定'],
  config: ['配置', '环境变量', '密钥', '数据库连接', '第三方服务'],
  bug: ['bug', 'Bug', '错误', '修复', '根因', '问题', '崩溃', '异常'],
  task: ['TODO', '未完成', '待办', '后续', '计划', '需要做', '下一步'],
  other: [],
}

const NAMESPACE_PATTERNS: [RegExp, string][] = [
  [/前端|Vue|Tailwind|scss|Pinia|路由|组件/i, 'agent:frontend-dev'],
  [/后端|NestJS|Prisma|PostgreSQL|API|数据库|pgvector/i, 'agent:backend-dev'],
  [/LangChain|LangGraph|Agent|LLM|RAG|向量|prompt/i, 'agent:ai-dev'],
  [/项目|架构|配置|认证|JWT|部署/i, 'project:trip-planner'],
]

function detectNamespace(content: string): string {
  for (const [pattern, ns] of NAMESPACE_PATTERNS) {
    if (pattern.test(content)) return ns
  }
  return 'shared:'
}

function readExport(inputPath: string): MemoryRecord[] {
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))
  if (Array.isArray(raw)) return raw
  if (raw.data && Array.isArray(raw.data)) return raw.data
  if (raw.records && Array.isArray(raw.records)) return raw.records
  return [raw]
}

function clusterByNamespace(records: MemoryRecord[]): Map<string, MemoryRecord[]> {
  const map = new Map<string, MemoryRecord[]>()
  for (const rec of records) {
    const ns = rec.metadata?.namespace || detectNamespace(rec.content || '')
    if (!map.has(ns)) map.set(ns, [])
    map.get(ns)!.push(rec)
  }
  return map
}

function clusterByKeywords(records: MemoryRecord[]): Clusters {
  const groups: Clusters = Object.fromEntries(
    Object.entries(KEYWORD_GROUPS).map(([k]) => [k, { items: [] as MemoryRecord[] }])
  )

  for (const rec of records) {
    const content = rec.content || ''
    let matched = false
    for (const [name, keywords] of Object.entries(KEYWORD_GROUPS)) {
      if (name === 'other') continue
      if (keywords.some(kw => content.includes(kw))) {
        groups[name].items.push(rec)
        matched = true
        break
      }
    }
    if (!matched) groups['other'].items.push(rec)
  }
  return groups
}

function mergeGroup(
  groupName: string,
  items: MemoryRecord[],
  namespace: string,
  dryRun: boolean
): MergedResult | null {
  if (items.length === 0) return null

  const dates = items
    .map(i => i.created_at || i.metadata?.created_at || '')
    .filter(Boolean)
    .sort()
  const timeRange = dates.length >= 2 ? `${dates[0]} ~ ${dates[dates.length - 1]}` : dates[0] || '未知'

  const uniqueContents = [...new Set(items.map(i => i.content))]

  const labelMap: Record<string, string> = {
    architecture: '架构决策',
    preference: '用户偏好',
    config: '关键配置',
    bug: 'Bug 修复',
    task: '待办任务',
    other: '其他',
  }

  const isCritical = groupName === 'architecture' || groupName === 'preference' || groupName === 'config'

  if (dryRun) {
    console.log(`  [${namespace}] ${labelMap[groupName] || groupName}: ${items.length} 条 → ${isCritical ? '去重' : '合并'} → ${isCritical ? uniqueContents.length : 1} 条`)
    return null
  }

  let merged: string
  const header = `# ${labelMap[groupName] || groupName} (${namespace})`
  const meta = `> ${isCritical ? '去重' : '合并'}自 ${items.length} 条记录 | 时间范围: ${timeRange}\n\n`

  if (isCritical) {
    merged = header + '\n\n' + meta + uniqueContents.map(c => `- ${c}`).join('\n') + '\n'
  } else {
    merged = header + '\n\n' + meta + uniqueContents.map(c => `- ${c}`).join('\n') + '\n'
  }

  return {
    content: merged,
    metadata: {
      tier: isCritical ? 'critical' : 'normal',
      namespace,
      merged_from: items.length,
      time_range: timeRange,
      group: groupName,
    },
  }
}

function checkHeartbeatState(): void {
  const hbPath = path.resolve(process.cwd(), 'docs/memory/heartbeat-state.json')
  if (!fs.existsSync(hbPath)) {
    console.log('  heartbeat-state.json 不存在，跳过')
    return
  }

  const hb = JSON.parse(fs.readFileSync(hbPath, 'utf-8'))
  hb.last_maintenance = new Date().toISOString().slice(0, 10)
  hb.sizes.active_logs_count = (() => {
    try {
      return fs.readdirSync('docs/memory/conversations/active').length
    } catch {
      return 0
    }
  })()
  hb.history.push({
    date: hb.last_maintenance,
    action: 'compact_memory_run',
    detail: `compressed records to ${hb.sizes.active_logs_count} items`,
  })
  fs.writeFileSync(hbPath, JSON.stringify(hb, null, 2) + '\n')
  console.log(`  heartbeat-state.json 已更新`)
}

function syncToMemoryMd(mergedResults: MergedResult[]): void {
  const memPath = path.resolve(process.cwd(), 'docs/memory/MEMORY.md')
  if (!fs.existsSync(memPath)) {
    console.log('  MEMORY.md 不存在，跳过同步')
    return
  }

  let existing = fs.readFileSync(memPath, 'utf-8')
  const lines = existing.split('\n')

  const insertIndex = lines.findIndex(l => l.startsWith('## '))
  const archIndex = lines.findIndex(l => l.trim() === '## 架构决策')
  const bugIndex = lines.findIndex(l => l.trim() === '## Bug 修复记录')

  const newSections: string[] = []
  for (const result of mergedResults) {
    if (result.metadata.tier === 'critical') {
      const lines = result.content.split('\n').slice(2).filter(Boolean)
      const formatted = lines.map((l: string) => `- [${result.metadata.namespace}] ${l.replace(/^- /, '')}`)
      newSections.push(...formatted)
    }
  }

  if (newSections.length > 0) {
    existing += '\n\n---\n\n## 自动合并记录\n\n'
    existing += `> 合并自 compact-memory.ts | ${new Date().toISOString().slice(0, 10)}\n\n`
    existing += newSections.join('\n') + '\n'
    fs.writeFileSync(memPath, existing)
    console.log(`  MEMORY.md 已同步 ${newSections.length} 条合并记录`)
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  const parseArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag)
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined
  }

  const hasFlag = (flag: string): boolean => args.includes(flag)

  const mode = parseArg('--mode') || 'full'
  const inputFile = parseArg('--input')
  const outputFile = parseArg('--output') || path.resolve(process.cwd(), 'memory-merged-output.md')
  const syncFiles = hasFlag('--sync-files')
  const dryRun = hasFlag('--dry-run')

  if (mode === 'heartbeat') {
    console.log('🔍 Heartbeat 模式：检查记忆系统状态')
    checkHeartbeatState()
    return
  }

  if (hasFlag('--auto')) {
    console.log('🔄 Auto 模式：从 daily notes 自动收集并合并')
    const dailyDir = path.resolve(process.cwd(), 'docs/memory/daily')
    const memPath = path.resolve(process.cwd(), 'docs/memory/MEMORY.md')

    const allRecords: MemoryRecord[] = []
    const existingMem = readSafe(memPath)

    if (fs.existsSync(dailyDir)) {
      const files = fs.readdirSync(dailyDir).filter((f) => f.endsWith('.md')).sort().reverse().slice(0, 14)
      for (const file of files) {
        const content = readSafe(path.join(dailyDir, file))
        const date = file.replace('.md', '')
        const lines = content.split('\n').filter((l) => /^- \[/.test(l) || /^- \d{4}/.test(l))
        for (const line of lines) {
          allRecords.push({ content: line, created_at: date, metadata: { tier: 'daily' } })
        }
      }
    }

    if (existingMem) {
      const lines = existingMem.split('\n').filter((l) => /^\s*-\s*\d{4}-\d{2}-\d{2}\s*\|/.test(l))
      for (const line of lines) {
        allRecords.push({ content: line, metadata: { tier: 'mem' } })
      }
    }

    console.log(`  收集到 ${allRecords.length} 条记录`)
    if (allRecords.length === 0) {
      console.log('  无记录，跳过')
      return
    }

    const nsMap = clusterByNamespace(allRecords)
    const allMerged: MergedResult[] = []

    for (const [namespace, nsRecords] of nsMap) {
      console.log(`\n📁 命名空间: ${namespace} (${nsRecords.length} 条)`)
      const groups = clusterByKeywords(nsRecords)
      for (const [groupName, group] of Object.entries(groups)) {
        const result = mergeGroup(groupName, group.items, namespace, dryRun)
        if (result) allMerged.push(result)
      }
    }

    if (dryRun) {
      console.log(`\n📊 分析完成 (dry-run)，未写入`)
      return
    }

    if (syncFiles) {
      console.log('\n🔄 同步到 MEMORY.md...')
      syncToMemoryMd(allMerged)
    }

    checkHeartbeatState()
    console.log(`\n✅ Auto 合并完成`)
    return
  }

  if (!inputFile && mode !== 'quick') {
    console.error('用法: npx tsx scripts/compact-memory.ts --input <export.json> [--mode full|quick|heartbeat|auto] [--sync-files] [--dry-run]')
    process.exit(1)
  }

  let records: MemoryRecord[]
  if (inputFile) {
    records = readExport(inputFile)
  } else {
    console.error('quick 模式也需要 --input 参数')
    process.exit(1)
  }

  console.log(`读取到 ${records.length} 条记忆记录`)
  console.log(`模式: ${mode}${dryRun ? ' (dry-run)' : ''}${syncFiles ? ' + sync-files' : ''}`)

  const nsMap = clusterByNamespace(records)
  console.log(`检测到命名空间: ${[...nsMap.keys()].join(', ')}`)

  const allMerged: MergedResult[] = []

  for (const [namespace, nsRecords] of nsMap) {
    console.log(`\n📁 命名空间: ${namespace} (${nsRecords.length} 条)`)
    const groups = clusterByKeywords(nsRecords)

    for (const [groupName, group] of Object.entries(groups)) {
      const result = mergeGroup(groupName, group.items, namespace, dryRun)
      if (result) allMerged.push(result)
    }
  }

  if (dryRun) {
    console.log(`\n📊 分析完成 (dry-run)，未写入任何文件`)
    return
  }

  let output = '# 记忆合并结果\n\n'
  output += `> 原始记录: ${records.length} 条 | 合并后: ${allMerged.length} 条 | 日期: ${new Date().toISOString().slice(0, 10)}\n\n---\n\n`

  for (const result of allMerged) {
    output += result.content
    output += '\n---\n\n'
  }

  fs.writeFileSync(outputFile, output)
  console.log(`\n✅ 合并输出: ${outputFile}`)
  console.log(`   原始: ${records.length} 条 → 合并后: ${allMerged.length} 条`)

  if (syncFiles) {
    console.log('\n🔄 同步到文件系统...')
    syncToMemoryMd(allMerged)
  }

  checkHeartbeatState()

  console.log(`\n后续步骤：清理临时文件`)
}

main().catch(console.error)
