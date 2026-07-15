# AI 记忆

最后更新：2026-07-15

## Agent 架构

- Deep Agents 框架: `createDeepAgent` + 3 subagent（planner/modifier/qa）
- 迁移来源: 7 个自定义类（IntentRouter/TravelPlanner/TravelModifier/KnowledgeQA）
- Prompt 文件: `ai/src/prompts/coordinator.ts / planner.ts / modifier.ts / qa.ts`
- IntentRouter: LLM 意图分类 + 关键词降级
- TravelPlanner: 顺序编排 + SSE 事件流（4 个子 Agent: 交通/住宿/景点/预算）
- TravelModifier: 全量重生成
- KnowledgeQA: RAG 桩（待填充）
- 使用 `@tool` 装饰器替代 Tool 类

## MCP 工具集成

- 4 个 Tool: TransportTool / AccommodationTool / AmapTool / KnowledgeTool（预设示例数据）
- 服务清单: FireCrawl, context7, github/gitee, opencode-docs, Figma, langchain-docs, postgres, redis, Tavily-Search, Bing-Search, BoCha
- MCP 服务配置在 opencode.json 后全局自动可用

## LangChain 技能

- 已加载: langchain / langgraph / langsmith / deep-agents 四项技能
- 依赖: `@langchain/core ^1.2.2`, `@langchain/langgraph ^1.4.7`, `deepagents ^1.10.7`, `langchain ^1.5.3`, `zod`
- SSE 流式: 使用 `streamEvents` v3 API
- 不要用 `instanceof` 判断反序列化消息，改用 `_getType()`

## Prompt 规范

- 涉及 prompt 编写/修改必须先加载: `prompt-engineering` + `prompt-engineering-patterns`
- 优化场景额外加载: `prompt-optimizer`
- 禁止凭记忆直接编写 prompt
