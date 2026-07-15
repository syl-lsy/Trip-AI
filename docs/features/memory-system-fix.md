# Memory System — 修复实施计划

> 本文档基于 2026-07-15 记忆系统审计结果制定。
> 核心问题：日记文件严重超标、MEMORY.md 重复/格式混乱、topic 文件空洞、归档为空。

## 目录

1. [Phase 1：紧急压缩 — daily notes 瘦身](#phase-1紧急压缩--daily-notes-瘦身)
2. [Phase 2：MEMORY.md 去重与整理](#phase-2memorymd-去重与整理)
3. [Phase 3：Topic 文件充实](#phase-3topic-文件充实)
4. [Phase 4：ACTIVE-CONTEXT.md 刷新](#phase-4active-contextmd-刷新)
5. [Phase 5：防御机制 — 防止复发](#phase-5防御机制--防止复发)

---

## Phase 1：紧急压缩 — daily notes 瘦身

### 目标

4 篇 daily notes 从合计 15,908 行压缩至 ≤800 行（每篇 ≤200 行）。

### 执行步骤

1. 对每篇 daily note 运行提取脚本：
   - 保留含 `[category]` 标记的行（decision / config / bugfix / lesson / feature）
   - 保留功能完成记录（含 `docs/features/` 链接的行）
   - 保留架构决策和重要日期行
   - **删除**：对话记录、工具调用日志、重复的进度描述
2. 将被删除的原始关键行合并写入 `daily-archives/2026-07.md`
3. 压缩后的大小目标：

| 文件                  | 当前行数 | 目标行数 |
| --------------------- | -------- | -------- |
| `daily/2026-07-11.md` | 2,528    | ≤200     |
| `daily/2026-07-12.md` | 9,509    | ≤200     |
| `daily/2026-07-13.md` | 2,478    | ≤200     |
| `daily/2026-07-14.md` | 1,393    | ≤200     |

### 验证标准

- `wc -l daily/*.md` 每篇不超过 200 行
- `daily-archives/2026-07.md` 存在且非空

---

## Phase 2：MEMORY.md 去重与整理

### 目标

从 201 行 / 24KB 压缩至 ~120 行 / 15KB，消除冗余，拆分话题。

### 发现的重复杂目

| 条目                       | 重复次数                   | 处理方式              |
| -------------------------- | -------------------------- | --------------------- |
| Phase 2 Deep Agents 迁移   | 4 次（L89-97）             | 保留第一条            |
| Phase 2 智能规划工作台     | 2 次（L106-108）           | 保留第一条            |
| SSE 流式渲染改造           | 2 次（L83-85）             | 保留第一条            |
| Phase 2 Slice 1-5 完成记录 | 各 2 次                    | 去重，保留 concise 版 |
| `## 下一步` 残留标记       | 4 处（L80, 101, 186, 198） | 删除                  |
| `itectrue]` 拼写错误       | 全文搜索                   | 替换为 `architecture` |

### 执行步骤

1. 删除完全重复条目
2. 修复拼写错误和格式异常
3. 将 Deep Agents 迁移、Phase 2 规划工作台、SSE 重构等话题迁移到 `topics/` 新文件
4. MEMORY.md 中仅保留索引行：`YYYY-MM-DD \| topic \| 简述 \| 详见 topics/xxx.md`

### 需创建的话题文件

| 文件                        | 内容                                             |
| --------------------------- | ------------------------------------------------ |
| `topics/phase2-planning.md` | Phase 2 全栈实现、Slices 1-5、SSE 流式、AI Agent |
| `topics/ai-migration.md`    | Deep Agents 迁移、IntentRouter → createDeepAgent |
| `topics/devops.md`          | Gitee/GitHub 同步、git 清理、opencode.json 变更  |
| `topics/auth.md`            | JWT 配置、认证模块、角色字段                     |

### 验证标准

- MEMORY.md 行数 ≤180 行
- MEMORY.md 内无重复条目
- 新 topic 文件创建完成

---

## Phase 3：Topic 文件充实

### 目标

现有 3 个 topic 文件从 ~10 行/每个充实为含 Summary + Decision Log 的完整知识文件。

### 执行步骤

1. **填充现有 topic 文件**

   - `topics/ai-dev.md`：记录 LangChain 版本、Agent 架构、prompt 工程经验
   - `topics/backend-dev.md`：记录 Prisma 7 踩坑、NestJS 模式、pgvector 配置
   - `topics/frontend-dev.md`：记录 Vue 3 + Tailwind v4 模式、Pinia 状态管理

2. **新建 Phase 2 相关话题文件**

   从 MEMORY.md 拆分出的话题按模板组织：

   ```markdown
   # [Topic Name]

   Created: YYYY-MM-DD
   Last updated: YYYY-MM-DD

   ## Summary

   [2-3 sentences]

   ## Decision Log

   | Date | Decision | Reasoning |
   | ---- | -------- | --------- |
   ```

### 验证标准

- 每个 topic 文件 ≥20 行且有实质内容
- MEMORY.md 中对应条目已替换为 `详见 topics/xxx.md` 索引

---

## Phase 4：ACTIVE-CONTEXT.md 刷新

### 目标

从 7 月 12 日过时状态更新为当前项目状态。

### 执行步骤

1. **更新状态**
   - Phase 2（智能规划工作台）→ 已标记完成
   - 当前优先级：根据实际情况设定（记忆系统修复本身，或下一个 Phase）

2. **清理已完成项**
   - 移除 Phase 2 所有 Slice 的进行中标记
   - 保留关键决策索引行

3. **更新日期**
   - `Last updated: 2026-07-15`

### 验证标准

- ACTIVE-CONTEXT.md 最后更新日期为当天
- 无 Phase 2 遗留的未完成任务项

---

## Phase 5：防御机制 — 防止复发

### 目标

确保修复效果持久，不再出现 daily note 膨胀至数千行的情况。

### 执行步骤

1. **Plugin 级硬截断**

   修改 `auto-memory.ts` 中的 `appendToDaily`：
   - 当 daily note ≥300 行时，触发自动压缩
   - 压缩策略：保留最近 100 行 + 含 `[category]` 的行，其余合并到 `daily-archives/`

2. **MEMORY.md 写入过滤**

   `memory_write` 工具增加过滤：
   - 拒绝写入纯会话标记（如 `## 下一步`、`# Session`）
   - 拒绝写入空内容或仅有日期无正文的条目

3. **更新 MANAGEMENT.md 规则**

   | 规则              | 当前值   | 新值                     |
   | ----------------- | -------- | ------------------------ |
   | daily note 行上限 | 无硬限制 | **300 行，超限自动压缩** |
   | MEMORY.md 行上限  | 200 行   | **300 行**               |
   | 归档触发条件      | 30 天    | **7 天 + 超限自动归档**  |

4. **AGGREGATE 历史条数限制**

   heartbeat 的 history 数组从 50 条改为 20 条，降低 JSON 文件体积。

### 验证标准

- `auto-memory.ts` Plugin 编译通过（`pnpm check`）
- 模拟写入超过 300 行的 daily note 触发自动压缩
- heartbeat-state.json 从 ~5.7KB 降至 <2KB

---

## 附录：执行顺序与依赖

```
Phase 1 (压缩日记)
  └─→ Phase 2 (去重 MEMORY.md) — 需要 Phase 1 释放空间
       └─→ Phase 3 (充实 topics) — 需要 Phase 2 拆分出话题
            └─→ Phase 4 (刷新 ACTIVE) — 可并行
                 └─→ Phase 5 (防御机制) — 依赖前四步的实践经验
```

**预计总耗时**：1 次 dev-cycle（约 30-45 分钟脚本处理 + 15 分钟校验）

---

## Phase 6：Plugin 逻辑修复与规则补全（2026-07-15）

### 目标

修复 auto-memory.ts Plugin 的数据提取和去重逻辑缺陷，补全记忆管理规则，清理残留数据垃圾。

### 修复详情

#### 🔧 Plugin 逻辑修复

| 问题                       | 文件位置                       | 根因                                           | 修复                                                                   |
| -------------------------- | ------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------- |
| cross-session 提取含节标题 | auto-memory.ts L329, L339      | filter 只检查 `d.length > 20` 未过滤 `##` 开头 | 添加 `!d.startsWith('##')` 双重过滤                                    |
| auto_flush 去重误判        | auto-memory.ts L642            | 仅检查 `lastEntry.date === today()`            | 改为 `lastEntry.date === today() && lastEntry.action === 'auto_flush'` |
| 错误无法追溯               | auto-memory.ts 全部 6 处 catch | `catch {}` 静默吞掉所有错误                    | 全部改为 `catch(err) { console.error('[auto-memory]', err) }`          |

#### 🧹 数据清理

| 文件                     | 操作                                           | 结果            |
| ------------------------ | ---------------------------------------------- | --------------- |
| MEMORY.md Auto Memory 区 | 删除 4 行 `cross-session                       | ## 下一步` 垃圾 | 保留 3 条有效条目 |
| heartbeat-state.json     | 将 7/14 auto_flush 移到 7/15 overhaul 之前     | 时间序正确      |
| daily/2026-07-14.md      | 删除 L28-75 对话噪音（会话摘要、问题分析文本） | 75→27 行        |

#### 📋 规则补全

| 文件           | 新增内容                                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| MANAGEMENT.md  | `## Sessions 目录管理` 节（创建/写入/读取/清理规则）                                                                   |
| MANAGEMENT.md  | `## Topic 文件生命周期` 节（创建标准/更新/过期清理规则）                                                               |
| MANAGEMENT.md  | GC 表加 2 行：sessions 24h TTL、topic 90 天审查                                                                        |
| AUTO-MEMORY.md | 删除 3 个虚假未实现命令（/extract-memories, /extract-memories-llm, /consolidate-memory），改为说明 Plugin 自动提取机制 |

### 验证标准

- `memory_write` 已记录 3 条 lesson + 1 条 bugfix
- 经验文档已写入 `docs/lessons/auto-memory-plugin-logic-bugs.md`
- Memory 所有文件 line count 正常（MEMORY.md ≤120 行，daily ≤30 行）
