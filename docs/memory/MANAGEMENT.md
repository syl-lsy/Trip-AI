# 记忆管理

> 本文档定义项目的纯文件层记忆体系：5 层文件架构。
> 所有路径相对于 `docs/memory/`。

## 目录结构

```
docs/memory/
├── ACTIVE-CONTEXT.md      # 热记忆：当前会话状态（≤50行）
├── AUTO-MEMORY.md         # 自动记忆执行指令（agent 每轮回复后必读）
├── MEMORY.md              # 长期记忆：架构决策/用户偏好/教训（≤200行）
├── MANAGEMENT.md          # 本文件：管理规则
├── daily/                 # 每日笔记（按天归档）
│   └── YYYY-MM-DD.md      # 原始事件日志（≤200行）
├── topics/                # 主题深度知识（按需创建）
├── conversations/         # 对话日志（由 OpenCode 运行时自动生成）
│   ├── active/            # 最近 5 条活跃会话
│   └── archives/          # 按月归档
│       └── YYYY-MM/
│           ├── INDEX.md   # 目录索引
│           └── *.md       # 原始对话文件
└── heartbeat-state.json   # 心跳状态跟踪
```

## 5 层记忆架构

| 层 | 文件 | 用途 | 读取频率 | 写入频率 |
|----|------|------|---------|---------|
| **1. Hot** | `ACTIVE-CONTEXT.md` | 当前优先级、阻塞项、进行中工作 | 每次会话 | 每次会话结束 |
| **2. Warm** | `MEMORY.md` | 架构决策、用户偏好、关键配置 | 主要会话 | 每周整理 |
| **3. Daily** | `daily/YYYY-MM-DD.md` | 原始事件日志 | 当天+昨天 | 每天追加 |
| **4. Topic** | `topics/*.md` | 特定主题深度上下文 | 主题相关时 | 知识增长时 |
| **5. Cold** | `archives/` | 历史归档 | 极少 | 每季度 |

## Auto Memory（自动记忆）

执行指令见 `AUTO-MEMORY.md`，本文件仅做规则说明。

### 触发场景

| 场景 | 写入目标 | 说明 |
|------|---------|------|
| 偏好纠正 | `MEMORY.md` | 用户纠正了你的行为，如"用 pnpm 而非 npm" |
| 架构决策 | `MEMORY.md` | "选择 Prisma 的原因：事务支持更完善" |
| Bug 根因 | `daily/YYYY-MM-DD.md` | "缓存 TTL 未设置导致数据陈旧" |
| 任务完成 | `daily/YYYY-MM-DD.md` + `ACTIVE-CONTEXT.md` | 记录产出与进度 |
| 用户说"记住这个" | `MEMORY.md` | 用户 Explicit 要求 |
| 关键配置 | `MEMORY.md` | API 基础路径、DB 连接、第三方 Key 位置 |

### Agent 记忆命名空间

不同 Agent 的知识写入专门的 topic 文件，避免 MEMORY.md 膨胀：

| Agent | Topic 文件 |
|-------|-----------|
| frontend-dev | `topics/frontend-dev.md` |
| backend-dev | `topics/backend-dev.md` |
| ai-dev | `topics/ai-dev.md` |
| 共享知识 | `MEMORY.md` |

读取规则：
- MEMORY.md → 所有 agent 每次会话自动加载
- topics/{agent}.md → 仅对应 agent 按需读取
- coordinator / tester / reviewer / docs-writer → 知识并入 MEMORY.md

### 大小预算

| 文件 | 预算 | 超限处理 |
|------|------|---------|
| MEMORY.md | **≤ 200 行** | 拆分深话题到 `topics/` |
| ACTIVE-CONTEXT.md | ≤ 50 行 | 清理已完成项 |
| daily/YYYY-MM-DD.md | ≤ 200 行 | 精简 |
| topics/*.md | ≤ 300 行 | 拆分或归档 |

## 回复前 — 检索链

```
1. 读取 ACTIVE-CONTEXT.md        — 热记忆，瞬间获取当前状态
2. 扫描 MEMORY.md（快速扫读）     — 是否已有相关长期决策
3. 读取 daily/今日日期.md          — 今天发生了什么
4. 读取 daily/昨日日期.md          — 昨天有什么遗留
```

## 回复后 — 存储规则

### 写入目标矩阵

| 信息类型 | 写入文件 |
|---------|---------|
| 架构决策 / trade-off | `MEMORY.md` + 可选 `topics/` |
| 用户技术栈/命名偏好 | `MEMORY.md` |
| 关键配置(DB/第三方) | `MEMORY.md` |
| Bug 根因和修复方案 | `daily/YYYY-MM-DD.md` |
| 未完成任务/后续规划 | `ACTIVE-CONTEXT.md` + `daily/` |
| 当前会话进度 | `ACTIVE-CONTEXT.md` |
| 功能/变更完成 | `daily/` + `MEMORY.md` 索引行（格式：`YYYY-MM-DD | feature | 名称 | 详见 docs/features/xxx.md`）|
| 琐碎操作(pnpm install等) | ❌ 不存 |

### 写入前去重

```
1. 确定目标文件 → 读取文件现有内容
2. 如果与现有内容高度相似 → 合并/更新，不追加
3. 否则 → 追加到文件
```

## 新会话启动时 — 自动维护流程

```
1. 读取 heartbeat-state.json
2. 读取 ACTIVE-CONTEXT.md
3. 读取 MEMORY.md
4. 读取今天的 daily 笔记
5. 读取昨天的 daily 笔记
6. 检查对话日志 > 10? → 执行归档（保留最新5条，旧→archives/）
```

## 对话日志归档规则

```
1. glob 扫描 conversations/active/*.md
2. 如果文件数 > 10:
     保留最新 5 条
     将最旧的文件复制到 archives/{YYYY-MM}/
     更新 archives/{YYYY-MM}/INDEX.md
     删除原始文件
3. GC: archives/ 下 .md 文件数 > 100 时，删除最旧的直至 ≤ 100
```

## GC（垃圾回收）规则

| 检查项 | 触发条件 | 动作 |
|--------|---------|------|
| ACTIVE-CONTEXT 超 50 行 | 每次会话结束 | 清理已完成项→移至 daily |
| MEMORY.md 超 200 行 | 每次主会话 | 拆分深话题→topics/ |
| daily 超过 30 天 | 每次新会话 | 摘要入 archive，删除原始 |
| archives 超过 100 个文件 | 每小时（定时 job） | 脚本 `gc_archives()` 按文件数量清理 |
| archives 超过 90 天无修改 | 每次 session.idle（Plugin） | Plugin 按 mtime 安全网清理 |
| heartbeat 超过 30 天未更新 | 每次新会话 | 自动运行心跳维护 |

> **双保险机制**：`scripts/archive-conversations.sh` 每小时运行一次，按**文件数量**清理（>100 保留最新的）；`auto-memory.ts` Plugin 在每次 session 空闲时按**修改时间**清理（>90 天）。两者独立互补——定时脚本是主力，Plugin 是安全网。

## Heartbeat 状态文件

`docs/memory/heartbeat-state.json` 结构：

```json
{
  "version": 1,
  "last_maintenance": "",
  "sizes": {
    "active_context_lines": 0,
    "memory_md_lines": 0,
    "daily_notes_count": 0,
    "topic_files_count": 0,
    "active_logs_count": 0
  },
  "scheduled": {
    "next_weekly_review": "",
    "next_quarterly_archive": ""
  },
  "history": []
}
```

## 安全规则

- 永不将 API 密钥、密码、Token 存入任何记忆文件
- MEMORY.md 含个人偏好/架构决策，不在群聊/共享上下文中加载
