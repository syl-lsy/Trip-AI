# 项目规范

## OpenCode 配置规范

在编写或修改任何 OpenCode 相关配置之前，必须先查阅官方文档确认语法支持：

| 配置项 | 文档路径 |
|--------|----------|
| opencode.json 配置格式 | `opencode_get_page("config/")` |
| MCP 服务器配置 | `opencode_get_page("mcp-servers/")` |
| Agent / Subagent 配置 | `opencode_get_page("agents/")` |
| Skill 编写 | `opencode_get_page("skills/")` |
| Plugin 开发 | `opencode_get_page("plugins/")` |
| 权限控制 | `opencode_get_page("permissions/")` |
| 自定义工具 | `opencode_get_page("custom-tools/")` |
| 命令配置 | `opencode_get_page("commands/")` |

禁止凭记忆直接编写，必须以官方文档的最新版本为准。

## 文档撰写

当需要撰写任何文档时，使用 @docs-writer 子智能体完成。

## 功能完成文档沉淀

每次功能开发完成（reviewer 通过后），必须由 docs-writer 产出/更新功能文档：

- **新功能** → 新建 `docs/features/<功能名>.md`（按模板 `docs/features/feature-template.md`）
- **已有功能新增/修改** → 直接在已有文档补充
- **Bug 修复** → 直接在已有文档补充

## 提示词开发规范

涉及任何 prompt/提示词的编写、修改或优化时（包括 `.opencode/prompts/` 中的 agent prompt
和 `ai/prompts/` 中的 AI Agent prompt），**必须遵循以下流程，不得跳过**：

| 步骤 | 操作 | 适用场景 |
|------|------|---------|
| 1 | `skill({name: "prompt-engineering"})` | 所有 prompt 任务 |
| 2 | `skill({name: "prompt-engineering-patterns"})` | 所有 prompt 任务 |
| 3 | `skill({name: "prompt-optimizer"})` | 优化已有 prompt 时必做 |
| 4 | 然后才能编写/修改 prompt 文件 | — |

禁止凭记忆直接编写 prompt。

---

## 项目概览

### 按需加载的外部文件

以下文件不会自动加载，请在对应任务需要时使用 Read 工具主动读取：

| 文件 | 读取时机 |
|------|---------|
| `docs/architecture/tech-stack.md` | 涉及技术选型、新增依赖时 |
| `docs/architecture/project-structure.md` | 需要了解项目目录布局时 |
| `docs/architecture/design-tokens.md` | 前端开发涉及颜色/字体等设计规范时 |
| `docs/api/api-endpoints.md` | 需要调用或修改 API 端点时 |
| `docs/mcp-services.md` | 需要使用 MCP 服务时 |
| `docs/ai-agent-spec.md` | AI Agent 开发时 |
| `docs/architecture/ai-layer.md` | AI 层架构设计时 |
| `docs/agent-workflow.md` | 涉及子智能体编排时 |
| `docs/features/feature-template.md` | 功能开发完成后沉淀文档时 |
