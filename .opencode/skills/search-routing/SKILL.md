---
name: search-routing
description: >
  Routes search/documentation queries to the correct tool. Trigger for: any tech
  search ("搜索", "查", "找", "search", "find", "look up"), library/framework usage
  ("API", "documentation", "docs", "语法", "怎么用", "如何", "config"), tech trends
  ("热门", "新特性", "features", "trending", "推荐"), Chinese community opinions
  ("评价", "社区"), and ALL OpenCode configuration (opencode.json, MCP servers,
  agents, permissions, skills, plugins, .opencode/ files). ALWAYS consult this
  skill for OpenCode tasks — even if you think you know the format. Do NOT trigger
  for: write-code tasks ("写一个", "实现"), refactoring, debugging, deployment,
  infrastructure config (Docker, CI/CD), or pure explanations without any lookup.
---

## 核心原则

1. **先查官方文档，再动手** — 涉及 API、框架、库、配置的问题，先用文档工具验证，再用已有知识
2. **信任但不盲信** — 即使你自信知道答案，也要用文档工具验证。框架 API 会变，知识会过时，context7 给出的是最新官方信息
3. **精准优先** — 选择最直接的工具（框架 API → context7，不走通用搜索引擎）
4. **交叉验证** — 重要/有疑点的信息，用 2 个独立工具确认
5. **失败降级** — 首选工具无结果时，依次降级到下一级工具

## 工具分类

### 中文搜索
| 工具 | 场景 | 降级 |
|------|------|------|
| `Bing-Search` | 中文通用搜索，国内内容 | 无结果时换 BoCha |
| `BoCha` | AI 搜索 + 结构化结果 | 无结果时换 Bing |

### 英文/国际搜索
| 工具 | 场景 | 降级 |
|------|------|------|
| `Tavily-Search` | 国际内容、英文技术文章、Stack Overflow | 无结果时换 webfetch 抓具体页面 |

### 网页内容提取
| 工具 | 场景 |
|------|------|
| `webfetch` / `Fetch-Search` | 从 URL 抓取完整内容 |
| `Tavily-extract` | 从 URL 提取原始内容 |
| `Bing-crawl` | 抓取必应搜索结果详情页 |

### 技术文档
| 工具 | 场景 | 使用方式 | 降级 |
|------|------|----------|------|
| `context7` | 任意框架/库 API 文档 | resolve-library-id → query-docs | resolve 无匹配时用搜索引擎 + webfetch |
| `langchain-docs` | LangChain 专属文档 | search → query_docs_filesystem | 查不到时用 context7 或 Tavily |
| `opencode-docs` | OpenCode 自身配置文档 | opencode_search_docs → opencode_get_page | 无结果时用 Tavily 搜 opencode.ai |

## opencode-docs 工具调用细则

当需要查询 OpenCode 配置文档时，按以下步骤调用 `opencode-docs` MCP 工具：

### 搜索
```
opencode_search_docs(关键词)   — 搜索文档标题和内容
```
- 关键词用英文，如 `"mcp"`、`"permissions"`、`"agent"`、`"skill configuration"`
- 如果首次搜索无结果，尝试不同的关键词组合
- 如果所有关键词都无结果，走降级流程（Tavily 搜 opencode.ai）

### 获取页面
```
opencode_get_page(路径) — 获取指定文档页面的完整内容
```
- 路径是相对于 opencode.ai 的路径，如 `"mcp-servers/"`、`"permissions/"`
- 路径不需要以 `/` 开头或包含域名
- 如果 opencode_get_page 不可用，用 `webfetch` 直接抓取 `https://opencode.ai/docs/{路径}`

### 关键词参考

| 配置主题 | 搜索关键词 | 页面路径 |
|----------|-----------|---------|
| MCP 服务器配置 | `mcp` | `mcp-servers/` |
| 权限规则 | `permission` | `permissions/` |
| Agent 配置 | `agent` | `agents/` |
| 技能配置 | `skill` | `skills/` |
| 环境变量 | `environment` | `environment/` |

## 多工具串联模式

在某些场景下，按顺序组合使用多个工具，效果优于单一工具：

### OpenCode 配置（必读）
```
opencode-docs 获取官方文档 → customize-opencode 技能执行修改
```

### 框架/库 API 查询
```
context7 获取 API（首选）→ 不够用时 Tavily 搜社区实践
```

### 技术调研
```
Tavily 搜索最新信息 → webfetch 抓取关键文章全文 → context7 查官方 API 确认
```

### 中文信息检索
```
Bing 宽搜 → 发现具体 URL → webfetch 提取详情页 → BoCha 结构化对比
```

## OpenCode 配置专有规则

以下场景**必须**先调用 `opencode-docs` 查询官方文档，再加载 `customize-opencode` 技能执行修改，两步不可颠倒：

**触发场景**：
- 修改 `opencode.json` / `opencode.jsonc`
- 新增/修改 Agent
- 新增/修改 MCP 服务器
- 配置权限规则
- 创建/修改技能
- 安装/配置插件
- 修改 `.opencode/` 目录下任何文件
- 用户问"opencode 可以 X 吗"、"opencode 怎样配置 Y"

**严格执行流程**：
```
收到 OpenCode 配置请求
  └→ 1. opencode_search_docs(关键词) 搜索相关文档
  └→ 2. opencode_get_page(页面路径) 获取完整官方配置说明
  └→ 3. skill("customize-opencode") 加载配置技能
  └→ 4. 按照官方文档和技能规范编写/修改配置
  └→ 5. 提示用户重启 opencode 生效
```

## 决策流程

```
用户请求搜索/查询/配置
  │
  ├─ OpenCode 配置相关？                      ──→ opencode-docs → customize-opencode
  │
  ├─ 问某框架/库/工具的 API/用法？
  │     ├─ resolve-library-id 有匹配            ──→ context7 query-docs
  │     └─ 无匹配                              ──→ 搜索引擎定位 → webfetch 抓官网
  │
  ├─ LangChain 专属问题？                      ──→ langchain-docs
  │
  ├─ 中文内容/国内技术/中国社区？
  │     ├─ 宽泛了解                           ──→ Bing-Search
  │     └─ 需要结构化结果/AI 摘要              ──→ BoCha
  │
  ├─ 英文/国际内容？
  │     ├─ 最新技术/框架/趋势                  ──→ Tavily-Search
  │     └─ 需要搜索结果更准确                  ──→ Tavily + webfetch 抓详情
  │
  ├─ 已知具体 URL？                           ──→ webfetch / Tavily-extract
  │
  └─ 需要多角度/交叉对比？
        └─ 按"多工具串联模式"依次执行
```

## 主工具失败降级流程

当首选工具不可用或无结果时：

### context7 无匹配
```
resolve-library-id 返回空或低质量匹配
  └→ 用 Tavily 搜 "[库名] documentation [版本]"
  └→ 找到官网 URL 后用 webfetch 抓取关键页面
```

### opencode-docs 无结果
```
搜索关键词没有匹配页面
  └→ 换其他关键词重试
  └→ 仍不行用 Tavily 搜 "opencode.ai [关键词]"
  └→ 读取 opencode.json schema（如有）
```

### Bing/BoCha 无结果
```
中文搜索无结果
  └→ 尝试 Tavily 搜英文关键词
  └→ or 换更短/更长的搜索词重试
```

## 交叉验证规则

判断是否需要交叉验证的标准：

| 场景 | 验证要求 |
|------|----------|
| OpenCode 配置 | 必须查官方文档，无需二次验证 |
| 框架/库 API 语法 | 首选 context7，结果有疑时搜社区确认 |
| 技术新闻/趋势 | Tavily + 另一个源对比 |
| 中文社区评价 | Bing + BoCha 对比 |
| 版本特定行为 | context7（指定版本）+ Tavily 搜 issue |
| 用户项目内的配置 | 无需交叉验证 |

## 分步执行模板

当查询较复杂时，按此模板执行：

```
1. 分类判断 → 确定主工具（参考决策流程）
2. 调用主工具 → 记录结果
3. 结果评估 → 充分吗？有矛盾吗？
   ├─ 充足且一致 → 跳到步骤 5
   └─ 不充分/有疑点 → 步骤 4
4. 降级/交叉验证 → 调用次级工具
5. 信息整合 → 按来源标注，回复用户
```

对于 OpenCode 配置任务：步骤 1-2 是查文档，步骤 3-5 是写配置，两阶段严格分开。

## Red Flags — 常见错误

这些想法意味着你正在偏离技能指引，立刻停止并重新阅读决策流程：

| 想法 | 正确做法 |
|------|----------|
| "这个框架的 API 我很熟，不用查了" | 用 context7 验证——你的知识可能基于旧版本 |
| "用户只是问一个简单问题" | 简单的技术问题也可能涉及 API，用文档工具确认 |
| "先回复用户，查文档是下一步的事" | 先查文档再回复，顺序不可颠倒 |
| "搜索引擎就够了" | 技术文档专用工具（context7）比通用搜索更准确 |
| "opencode 配置我懂的" | 每次都要查 opencode-docs，配置格式会随版本变化 |
| "这个问题用中文搜索没结果" | 降级到英文搜索（Tavily），不要放弃 |
| "我刚刚查过这个库了" | 同一个会话中再次遇到时，缓存结果可用，但版本变更时需重查 |
| "先改配置，再验证格式" | 先查官方文档确认格式，再修改配置 |
