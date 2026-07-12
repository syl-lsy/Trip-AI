# 项目规范

## OpenCode 配置规范

在编写或修改任何 OpenCode 相关配置之前，必须先查阅官方文档确认语法支持：

| 配置项                 | 文档路径                             |
| ---------------------- | ------------------------------------ |
| opencode.json 配置格式 | `opencode_get_page("config/")`       |
| MCP 服务器配置         | `opencode_get_page("mcp-servers/")`  |
| Agent / Subagent 配置  | `opencode_get_page("agents/")`       |
| Skill 编写             | `opencode_get_page("skills/")`       |
| Plugin 开发            | `opencode_get_page("plugins/")`      |
| 权限控制               | `opencode_get_page("permissions/")`  |
| 自定义工具             | `opencode_get_page("custom-tools/")` |
| 命令配置               | `opencode_get_page("commands/")`     |

禁止凭记忆直接编写，必须以官方文档的最新版本为准。

## 开发流水线

### 流程判断

当用户提出需求时，AI 按以下规则判断处理方式：

| 需求类型                | 示例                                    | 处理方式                                        |
| ----------------------- | --------------------------------------- | ----------------------------------------------- |
| **普通对话**            | 查代码、问问题、查配置、闲聊            | 直接回复，不走流水线                            |
| **小改动**              | 文案修改、CSS 调整、单文件简单 Bug 修复 | 直接修改，完成后补文档                          |
| **功能开发 / Bug 修复** | 新模块、新页面、新 API、逻辑性 Bug      | **必须走 dev-cycle**，AI 主动启动或询问用户确认 |

**执行规则**：

- 需求涉及功能开发或业务 Bug 修复时，AI **不得直接编码**
- AI 必须主动询问用户是否走完整 `dev-cycle` 流水线，或直接启动 `task(coordinator)` 编排
- 如果用户明确要求直接处理不流水线，AI 可以执行，但完成后必须补文档

### 流水线顺序

每次功能开发必须按以下顺序，不可跳过任何步骤：

1. **代码实现** → 对应 dev agent（frontend-dev / backend-dev / ai-dev）
2. **⛔ 工程门禁** → 运行 `pnpm check`（包含 lint + typecheck + build）
3. **✅ 测试验收** → tester 运行测试套件 + 覆盖率检查
4. **🔒 对抗性测试** → verifier 查找安全漏洞和边界缺陷
5. **👁 代码审查** → reviewer 审查代码质量
6. **📝 文档沉淀** → docs-writer 更新功能文档

**门禁规则**：

- lint / typecheck / build 任一失败 → 退回对应 dev agent 修复，不进入下一步
- 任何 Agent 发现门禁环节被跳过 → 拒绝继续并报告
- 工程门禁由 tester 子 Agent 在测试前执行

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

| 步骤 | 操作                                           | 适用场景               |
| ---- | ---------------------------------------------- | ---------------------- |
| 1    | `skill({name: "prompt-engineering"})`          | 所有 prompt 任务       |
| 2    | `skill({name: "prompt-engineering-patterns"})` | 所有 prompt 任务       |
| 3    | `skill({name: "prompt-optimizer"})`            | 优化已有 prompt 时必做 |
| 4    | 然后才能编写/修改 prompt 文件                  | —                      |

禁止凭记忆直接编写 prompt。

---

## 项目概览

### 按需加载的外部文件

以下文件不会自动加载，请在对应任务需要时使用 Read 工具主动读取：

## 代码规范

### 常量规范

所有可能变化的字面量（URL、状态码、Storage Key、超时时间、错误信息）必须集中定义在 `packages/shared/src/constants/` 中，禁止在业务代码中直接硬编码。

| 分类        | 文件                   | 示例                         |
| ----------- | ---------------------- | ---------------------------- |
| API 路径    | `constants/api.ts`     | `API_PREFIX`, `ROUTES.LOGIN` |
| Storage Key | `constants/storage.ts` | `STORAGE_KEYS.TOKEN`         |
| HTTP 状态码 | `constants/http.ts`    | `HTTP_STATUS.UNAUTHORIZED`   |
| 超时时间    | `constants/time.ts`    | `DURATION.ONE_MINUTE`        |
| 错误信息    | `constants/error.ts`   | `ERROR_MSG.NOT_FOUND`        |

引用方式：`import { API_PREFIX } from '@trip/shared'`

### 命名规范

| 类别        | 规范                            | 示例                              |
| ----------- | ------------------------------- | --------------------------------- |
| 变量        | camelCase 或 UPPER_CASE（常量） | `userName`, `API_PREFIX`          |
| 函数        | camelCase                       | `getUser`, `formatDate`           |
| 类 / 组件   | PascalCase                      | `AuthGuard`, `LoginView`          |
| 接口        | PascalCase                      | `ApiResponse<T>`                  |
| 类型别名    | PascalCase                      | `UserRole`                        |
| 枚举        | PascalCase                      | `TravelMode`                      |
| 文件 / 目录 | kebab-case                      | `auth.guard.ts`, `login-view.vue` |
| Pinia Store | `useXxxStore`                   | `useAuthStore`                    |
| NestJS 模块 | `XxxModule`                     | `AuthModule`                      |

每项功能开发完成（reviewer 通过后），必须由 docs-writer 产出/更新功能文档：

- **新功能** → 新建 `docs/features/<功能名>.md`（按模板 `docs/features/feature-template.md`）
  | `docs/architecture/project-structure.md` | 需要了解项目目录布局时 |
  | `docs/architecture/design-tokens.md` | 前端开发涉及颜色/字体等设计规范时 |
  | `docs/api/api-endpoints.md` | 需要调用或修改 API 端点时 |
  | `docs/mcp-services.md` | 需要使用 MCP 服务时 |
  | `docs/ai-agent-spec.md` | AI Agent 开发时 |
  | `docs/architecture/ai-layer.md` | AI 层架构设计时 |
  | `docs/agent-workflow.md` | 涉及子智能体编排时 |
  | `docs/features/feature-template.md` | 功能开发完成后沉淀文档时 |

## 双仓库同步规范

### 提交信息规范

所有 Git commit message **必须使用英文书写**，遵循 Conventional Commits 格式：
`<type>(<scope>): <description>`。例如 `feat(auth): add login API`、`fix: correct null pointer`。

### 推送流程

每次功能开发完成（reviewer 通过后），AI **必须主动询问**用户是否需要推送到远程仓库：

> "代码已开发完成，是否需要推送到 GitHub 和 Gitee？"

用户确认后执行同步，否则跳过。

```bash
# 使用同步脚本（推荐）
zsh scripts/git-sync.sh "feat: 本次提交说明"

# 或手动双推
git push github <branch>
git push gitee <branch>
```
