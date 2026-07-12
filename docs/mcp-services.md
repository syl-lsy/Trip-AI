# MCP 服务使用指南

项目配置了以下 MCP 服务器，各 Agent 可在对应场景中直接使用（无需在 prompt 中声明可用性）：

| MCP 服务 | 使用场景 | 适用 Agent |
|----------|---------|-----------|
| `FireCrawl` | 网页搜索、内容抓取、技术调研 | 全部 |
| `context7` | 查询库/框架最新 API 文档和版本 | 全部（尤其在新增依赖时） |
| `github` / `gitee` | 浏览代码仓库、PR、提交历史 | 全部 |
| `opencode-docs` | 查阅 OpenCode 配置和功能文档 | coordinator, docs-writer |
| `Figma` | 读取设计稿数据、导出 UI 资源 | frontend-dev, docs-writer |
| `langchain-docs` | 查询 LangChain/LangGraph/LangSmith API | ai-dev |
| `postgres` | 执行 SQL 查询、验证数据库结构 | backend-dev, ai-dev, tester, reviewer |
| `redis` | 操作缓存数据、验证缓存策略 | backend-dev, reviewer |
| `Bing-Search` / `BoCha` | 中文搜索 | 全部 |
| `Tavily-Search` | 英文/国际技术搜索 | 全部 |
