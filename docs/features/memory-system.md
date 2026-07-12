---
title: 记忆系统
date: 2026-07-11
type: enhancement
layer: fullstack
---

## 功能概述

记忆系统分 5 个 Phase 持续推进，从基础架构到 GC/搜索优化到双保险机制：

| Phase | 主题 | 核心变更 |
|-------|------|---------|
| Phase 1 | 基础架构 | BM25 检索、硬截断、Compaction 保留、后台提取 |
| Phase 2 | 日志与 GC 修复 | GC mtime 修复、Heartbeat 去重、对话日志归档 |
| Phase 3 | 搜索升级 | BM25 段落级分块、context-mode 桥接 |
| Phase 4 | 跨会话整合 | 跨会话知识整合、MEMORY.md 同步、检索链指令强化 |
| Phase 5 | Archives 双保险 | 定时 job 主力 GC + Plugin 安全网 |

## 架构总览

```
                      ┌──────────────────────────────────┐
                      │       opencode.json               │
                      │  instructions: 5 个文件自动加载    │
                      │  compaction: auto + reserved      │
                      │  commands: 6+ 个记忆相关命令       │
                      └──────────┬───────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Plugin 运行时层  │   │  Script 工具层   │   │  文件存储层      │
│ auto-memory.ts   │   │ extract-        │   │ docs/memory/    │
│                   │   │ memories.ts     │   │ 5 层架构        │
│ - BM25 搜索       │   │ compact-        │   │                 │
│ - 硬截断           │   │ memory.ts       │   │ MEMORY.md       │
│ - compaction      │   │ archive-        │   │ ACTIVE-CONTEXT  │
│ - 心跳同步         │   │ conversations   │   │ daily/ topics/  │
│ - 跨会话整合       │   │ build-rules.ts  │   │ conversations/  │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

### Plugin 运行时层（`.opencode/plugins/auto-memory.ts`）

| 组件 | 说明 | Phase |
|------|------|-------|
| **memory_search** | BM25 评分排序 + frontmatter 元数据，支持 precise/semantic 模式 | 1 |
| **memory_write** | 写入 MEMORY.md（自动去重 + 硬截断）+ 同步 daily note | 1 |
| **session_update** | 更新当前会话摘要（task / files / decision / next） | 1 |
| **spillover_list / spillover_read** | 列出/读取大工具输出的溢出备份 | 1 |
| **experimental.session.compacting** | 注入 MEMORY.md + ACTIVE-CONTEXT.md + 会话摘要 + 今日决策 | 1 |
| **tool.execute.after** | 记录文件修改 + 测试命令 + 大输出溢出备份 | 1 |
| **event: session.created** | 创建会话摘要文件 | 1 |
| **gcOldFiles (mtime 修复)** | 改用 `fs.promises.stat` 真实 mtime | 2 |
| **Heartbeat 去重** | 同日多条 auto_flush 合并为一条 | 2 |
| **extractParagraphs** | 段落级 BM25 分块替代逐行评分 | 3 |
| **queryContextMode** | memory_search 桥接 context-mode 查询 | 3 |
| **consolidateCrossSession** | 跨会话知识整合（最近 3 session 对比） | 4 |
| **syncMemoryFromDaily** | MEMORY.md 自动从 daily 同步决策 | 4 |
| **event: session.idle** | 心跳同步 + 会话摘要写入 daily + GC（溢出/会话/archives） | 1+5 |
| **archiveDir + ARCHIVE_TTL** | archives 90 天 TTL 安全网 GC | 5 |

### Script 工具层

| 脚本 | 功能 |
|------|------|
| `scripts/extract-memories.ts` | 扫描 daily notes / 对话日志，规则或 LLM 提取新记忆 |
| `scripts/compact-memory.ts` | 聚类去重合并，`--auto` 模式自动收集 daily notes |
| `scripts/archive-conversations.sh` | 对话日志归档（保留 5 条）+ GC（>100 文件清理） |
| `scripts/build-rules.ts` | 文件系统行走 + @-import 展开 + 规则合并 |

### 文件层次

```
docs/memory/
├── ACTIVE-CONTEXT.md      # 热记忆：当前优先级/进度（自动加载）
├── AUTO-MEMORY.md         # 自动记忆指令（自动加载，最后加载）
├── MEMORY.md              # 长期记忆 + 功能索引（自动加载，≤200行硬截断）
├── MANAGEMENT.md          # 管理规则参考（自动加载）
├── daily/                 # 每日原始日志（按需，启动时读昨日）
│   └── YYYY-MM-DD.md
├── topics/                # Agent 特有知识（按需）
│   ├── frontend-dev.md
│   ├── backend-dev.md
│   └── ai-dev.md
├── conversations/         # 对话日志（自动归档 + GC）
│   ├── active/            # 最近 5 条活跃会话
│   └── archives/          # 按月归档（双保险 GC）
└── heartbeat-state.json   # 心跳状态
```

---

## Phase 1: 基础架构

**核心问题**: 从零建立记忆系统，对齐 Claude Code memory 功能。

### 功能

- **记忆文件自动加载** — 每次会话自动加载 MEMORY.md / ACTIVE-CONTEXT.md / AUTO-MEMORY.md
- **Auto Memory（自动记忆）** — agent 在每轮回复后自主判断是否写入记忆
- **语义化检索** — BM25 评分排序 + agent LLM 语义相关性判断（替代纯 grep）
- **硬截断保护** — MEMORY.md 强制 200 行 / 25KB 上限
- **Compaction 保留** — 压缩时自动保留当前会话决策摘要
- **后台提取** — scripts 定时/按需扫描对话日志提取新记忆
- **Auto Consolidation** — 自动去重、合并、清理过期条目

### 关键决策

**BM25 替代纯 grep 检索**: Layer 1 词频评分，Layer 2 附带 frontmatter 元数据让 agent LLM 做语义判别，Fallback substring 匹配。

**硬截断而非软提示**: MEMORY.md 限制从 prompt 约束升级为运行时强制（200 行 / 25KB），截断时自动追加警告注释。

**后台提取双模式**: `--write` 模式关键词规则（快，无 API 开销），`--llm` 模式调用 LLM（准）。

**Compaction 保留**: 每次会话压缩时 Plugin 额外注入今日 daily note 中的决策行。

---

## Phase 2: 日志与 GC 修复

**核心问题**: GC 使用假 mtime 导致清理失效；心跳日志重复写入；conversations/ 根目录散落大量日志文件。

### 变更文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `.opencode/plugins/auto-memory.ts` | 修改 | GC mtime 修复、心跳去重、日志归档 |
| `docs/memory/conversations/` | 归档 | 76 个文件移入 `archives/2026-07/` |
| `docs/memory/MANAGEMENT.md` | 更新 | 目录结构说明与实现对齐 |

### 关键决策

**GC mtime 修复**: 移除假 `mtime()` 函数，`gcOldFiles()` 改用 `fs.promises.stat` 真实 mtime。清理顺序从文件名排序改为"最久未修改优先"。

**Heartbeat 去重**: 写入前检查 `history` 最后一条是否同日同 action，是则跳过。同日多条合并为一条。

**对话日志归档**: 从 `conversations/` 根目录改为 `archives/YYYY-MM/INDEX.md + 独立文件` 架构，78 个历史文件归档到 `archives/2026-07/`。

---

## Phase 3: 搜索升级

**核心问题**: BM25 逐行评分导致跨行匹配失效；`memory_search` 与 `ctx_search` 两套系统隔离。

### 变更文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `.opencode/plugins/auto-memory.ts` | 修改 | BM25 段落级分块、context-mode 桥接 |

### 关键决策

**BM25 段落级分块**: `extractParagraphs()` 将文件按连续非空行分块，块内行拼接后统一评分。语义匹配准确率显著提升。

**context-mode 桥接**: `memory_search` 通过 `opencode run` CLI 调用 `ctx_search`，结果与文件查询合并后排序。CLI 不可用时静默降级。

---

## Phase 4: 跨会话整合

**核心问题**: 每次会话独立积累决策，跨 session 共性未被提取；daily 笔记中的决策需人工归纳到 MEMORY.md；agent 在复杂场景下跳过检索链。

### 变更文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `.opencode/plugins/auto-memory.ts` | 修改 | 跨会话整合、MEMORY 同步 |
| `.opencode/opencode.json` | 修改 | 追加检索链指令 |

### 关键决策

**跨会话知识整合**: `consolidateCrossSession()` 读取最近 3 个 session 的决策行，统计高频共性（出现 >= 2 次）作为"经验教训"写入 MEMORY.md。不足 3 个 session 时跳过。

**MEMORY.md 自动同步**: `syncMemoryFromDaily()` 扫描 daily 笔记中的决策行，去重后写入 MEMORY.md 的 Auto Memory 区域。写入前检查 60 字符相似度。

**检索链指令强化**: 在 `opencode.json instructions` 最前面追加强制指令——回复前必须依次读 ACTIVE-CONTEXT.md / MEMORY.md / 当日 daily。

---

## Phase 5: Archives 双保险 GC

**核心问题**: 单一定时 job 可能因调度器故障或脚本异常失效，导致 archives 无限膨胀。

### 变更文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `.opencode/plugins/auto-memory.ts` | 修改 | 新增 `ARCHIVE_TTL_MS=90天`、`archiveDir()`、session.idle GC 调用 |
| `.opencode/opencode.json` | 修改 | 新增 `archive-conversations` 定时命令 |
| `docs/memory/MANAGEMENT.md` | 更新 | 添加双保险说明 |
| `scripts/archive-conversations.sh` | 已有 | 已有 `gc_archives()` 函数（>100 按文件数清理） |

### 架构

```
定时 job（主力）                    Plugin session.idle（安全网）
  └─ 每小时运行脚本                     └─ 每次空闲事件
       └─ archives/ .md > 100               └─ mtime > 90 天
       └─ 删除最旧文件至 ≤ 100              └─ 删除（保留 INDEX.md）
       └─ 清理空目录
       └─ 更新 INDEX.md
```

### 关键决策

**双保险架构**: 定时 job 失效 → Plugin 兜底清理；Plugin 未触发 → 定时 job 仍按文件数清理。两套机制独立，单点故障不影响整体。

**90 天 TTL 阈值**: Plugin 安全网按 mtime（90 天）而非文件数，保留最近 3 个月对话，不受总文件数影响。（`ARCHIVE_TTL_MS = 90 * 24 * 60 * 60 * 1000`）

**排除 INDEX.md**: GC 两端的 globFilter 均排除 `INDEX.md`。脚本端 `gc_archives()` 额外处理空目录删除和 INDEX.md 同步。

**定时 job 使用 prompt 模式**: 因 scheduler 的 command 模式有兼容问题，改用 prompt 模式通过自然语言指令触发脚本。

---

## 与 Claude Code 的差距

| 维度 | Claude Code | 当前实现 | 差距评估 |
|------|------------|---------|---------|
| 记忆检索 | Sonnet side-query 语义选择 | BM25 + agent LLM 判断 | **接近** |
| 硬截断 | 原生 `truncateEntrypointContent` | Plugin 运行时截断 | **对等** |
| Compaction | 8 种机制（微压缩 → collapse） | 基础 compaction 保留 | **大差距** |
| 后台提取 | fork subagent + Opus 侧查询 | Script 双模式（规则/LLM） | **中等** |
| Auto Dream | 空闲时 4 阶段 consolidation | `compact-memory.ts --auto` | **中等** |
| Session Memory | 结构化 session summary | ACTIVE-CONTEXT 手动维护 | **中等** |
| 日志 GC | 内置 | 双保险（脚本+Plugin） | **对等** |

---

## 测试结果

| 测试项 | 预期 | 结果 |
|--------|------|------|
| TypeScript 编译 | 零错误 | ✅ |
| GC mtime 修复 | 按真实 mtime 排序清理 | ✅ |
| Heartbeat 去重 | 同日仅一条记录 | ✅ |
| 对话日志归档 | `archives/YYYY-MM/` 独立文件 + INDEX.md | ✅ |
| BM25 段落匹配 | 段落级评分，跨行匹配 | ✅ |
| context-mode 桥接 | 合并查询结果 | ✅ |
| 跨会话整合 | 高频主题提取（>=3 session） | ✅ |
| MEMORY.md 同步 | daily → MEMORY.md 自动追加 | ✅ |
| Plugin 90 天 GC | 删除 mtime > 90 天的文件 | ✅ |
| Plugin 排除 INDEX.md | INDEX.md 不被删除 | ✅ |
| 定时 job 文件数 GC | >100 文件时清理至 ≤ 100 | ✅ |
| 定时 job prompt 模式 | 每小时自动触发 | ✅ |

---

## 注意事项

- Auto Memory 依赖 LLM 遵循指令，非系统强制
- `memory_search` 的 `semantic` 模式需要 query 包含具体技术术语以获得最佳 BM25 评分
- `--llm` 提取模式依赖 opencode CLI，首次调用需加载模型可能较慢
- MEMORY.md 硬截断为 Plugin 运行时强制，不在 Agent prompt 层约束
- `memory_search` 桥接 context-mode 依赖 CLI 可用，否则静默降级
- 跨会话整合至少需要 3 个 session 才有意义，不足时自动跳过
- `consolidateCrossSession()` 和 `syncMemoryFromDaily()` 在 `session.idle` 中触发，不阻塞主流程
- 定时 job 通过 scheduler prompt 模式运行（command 模式有兼容问题）
- Plugin 的 90 天 TTL 是安全网，正常情况下由定时 job 的 100 文件阈值触发 GC
- 两个机制的阈值可在 `ARCHIVE_TTL_MS` 和 `MAX_ARCHIVE_FILES` 分别调整
- 旧格式 `YYYY-MM-summary.md` 保留在月度目录中，不会自动删除
