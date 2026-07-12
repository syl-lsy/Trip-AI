/**
 * OpenCode 官方文档站点地图 (中文版)
 *
 * 数据来源：https://opencode.ai/sitemap.xml
 * 所有路径均为相对于 https://opencode.ai/docs/zh-cn/ 的路径
 */

export const DOCS_BASE_URL = "https://opencode.ai/docs/zh-cn";
export const DOCS_EN_BASE_URL = "https://opencode.ai/docs";
export const CONFIG_SCHEMA_URL = "https://opencode.ai/config.json";
export const SITEMAP_URL = "https://opencode.ai/sitemap.xml";

/** 字符限制 - 响应最大长度 */
export const CHARACTER_LIMIT = 30000;

/** 文档页面分类 */
export interface DocPage {
  /** 页面路径，相对于 DOCS_BASE_URL */
  path: string;
  /** 页面标题 */
  title: string;
  /** 页面分类 */
  category: string;
  /** 简要描述 */
  description: string;
  /** 标签/关键词，用于搜索 */
  tags: string[];
}

/** 完整的文档页面列表 */
export const DOC_PAGES: DocPage[] = [
  // ===== 一级页面 =====
  {
    path: "/",
    title: "简介",
    category: "入门",
    description: "OpenCode 概述、安装、配置、初始化和基本使用方法",
    tags: ["introduction", "getting-started", "install", "setup", "quickstart"],
  },
  {
    path: "config/",
    title: "配置",
    category: "入门",
    description: "OpenCode JSON 配置文件格式、位置、Schema 和所有配置项详表",
    tags: ["configuration", "opencode.json", "json", "schema", "settings"],
  },
  {
    path: "providers/",
    title: "提供商",
    category: "入门",
    description: "LLM 模型提供商配置，包括 API 密钥、模型选择和认证方式",
    tags: ["provider", "llm", "model", "api-key", "authentication"],
  },
  {
    path: "network/",
    title: "网络",
    category: "入门",
    description: "OpenCode 网络配置，包括代理设置和防火墙配置",
    tags: ["network", "proxy", "firewall", "connectivity"],
  },
  {
    path: "enterprise/",
    title: "企业版",
    category: "入门",
    description: "OpenCode 企业版功能、部署和管理",
    tags: ["enterprise", "enterprise-edition", "deployment"],
  },
  {
    path: "troubleshooting/",
    title: "故障排除",
    category: "入门",
    description: "常见问题的诊断和解决方法",
    tags: ["troubleshooting", "debug", "faq", "error", "issues"],
  },
  {
    path: "windows-wsl",
    title: "Windows",
    category: "入门",
    description: "在 Windows 系统上使用 OpenCode（包括 WSL 配置）",
    tags: ["windows", "wsl", "installation"],
  },

  // ===== 使用相关 =====
  {
    path: "go/",
    title: "Go",
    category: "使用",
    description: "在 Go 项目中使用 OpenCode",
    tags: ["go", "golang"],
  },
  {
    path: "tui/",
    title: "TUI",
    category: "使用",
    description: "终端用户界面 (TUI) 的使用方法和功能",
    tags: ["tui", "terminal", "ui", "terminal-ui"],
  },
  {
    path: "cli/",
    title: "CLI",
    category: "使用",
    description: "命令行界面 (CLI) 的使用方法和所有命令参考",
    tags: ["cli", "command-line", "opencode-run", "terminal"],
  },
  {
    path: "web/",
    title: "Web",
    category: "使用",
    description: "Web 界面版本 OpenCode 的使用方法",
    tags: ["web", "browser", "web-ui"],
  },
  {
    path: "ide/",
    title: "IDE",
    category: "使用",
    description: "IDE 扩展的使用方法（VS Code、JetBrains 等）",
    tags: ["ide", "vscode", "jetbrains", "extension"],
  },
  {
    path: "zen/",
    title: "Zen",
    category: "使用",
    description: "OpenCode Zen 模式——精选模型集合，简化配置体验",
    tags: ["zen", "model", "quick-start", "simple"],
  },
  {
    path: "share/",
    title: "分享",
    category: "使用",
    description: "对话分享功能，与团队分享 OpenCode 会话",
    tags: ["share", "share-chat", "team", "collaboration"],
  },
  {
    path: "github/",
    title: "GitHub",
    category: "使用",
    description: "GitHub 集成，包括 GitHub Actions 和 PR 审查",
    tags: ["github", "github-action", "pr-review", "ci"],
  },
  {
    path: "gitlab/",
    title: "GitLab",
    category: "使用",
    description: "GitLab 集成和配置方法",
    tags: ["gitlab", "gitlab-ci", "merge-request"],
  },

  // ===== 配置相关 =====
  {
    path: "tools/",
    title: "工具",
    category: "配置",
    description: "OpenCode 内置工具的配置和管理（读写文件、执行命令等）",
    tags: ["tools", "tool-config", "file-tools", "bash"],
  },
  {
    path: "rules/",
    title: "规则",
    category: "配置",
    description: "指令和规则配置，通过 AGENTS.md 和 instructions 控制模型行为",
    tags: ["rules", "instructions", "agents.md", "guidelines"],
  },
  {
    path: "agents/",
    title: "代理",
    category: "配置",
    description: "自定义 Agent 代理的创建和配置",
    tags: ["agent", "subagent", "custom-agent", "agent-config"],
  },
  {
    path: "models/",
    title: "模型",
    category: "配置",
    description: "模型的配置和使用，包括本地模型和远程模型",
    tags: ["model", "llm", "local-model", "remote-model"],
  },
  {
    path: "themes/",
    title: "主题",
    category: "配置",
    description: "TUI 主题配置和自定义主题创建",
    tags: ["theme", "themes", "appearance", "color-scheme"],
  },
  {
    path: "keybinds/",
    title: "快捷键",
    category: "配置",
    description: "自定义快捷键绑定配置",
    tags: ["keybinds", "shortcuts", "keyboard", "hotkeys"],
  },
  {
    path: "commands/",
    title: "命令",
    category: "配置",
    description: "自定义命令的创建和配置",
    tags: ["command", "custom-command", "template"],
  },
  {
    path: "formatters/",
    title: "格式化工具",
    category: "配置",
    description: "代码格式化工具的配置",
    tags: ["formatter", "format", "prettier", "code-format"],
  },
  {
    path: "permissions/",
    title: "权限",
    category: "配置",
    description: "权限控制配置，管理 Agent 可以执行的操作",
    tags: ["permission", "security", "access-control", "allow", "deny"],
  },
  {
    path: "policies/",
    title: "Policies",
    category: "配置",
    description: "组织策略配置，用于统一管理 Agent 行为规范",
    tags: ["policy", "policies", "organization", "compliance"],
  },
  {
    path: "lsp/",
    title: "LSP 服务器",
    category: "配置",
    description: "LSP (Language Server Protocol) 服务器配置",
    tags: ["lsp", "language-server", "intellisense"],
  },
  {
    path: "mcp-servers/",
    title: "MCP 服务器",
    category: "配置",
    description: "MCP (Model Context Protocol) 服务器的配置和管理",
    tags: ["mcp", "mcp-server", "model-context-protocol", "tool"],
  },
  {
    path: "acp/",
    title: "ACP 支持",
    category: "配置",
    description: "ACP (Agent Communication Protocol) 支持配置",
    tags: ["acp", "agent-communication", "protocol"],
  },
  {
    path: "skills/",
    title: "代理技能",
    category: "配置",
    description: "Skill 技能的编写指南——通过 SKILL.md 定义可复用行为",
    tags: ["skill", "skills", "skil.md", "agent-skill"],
  },
  {
    path: "references/",
    title: "References",
    category: "配置",
    description: "配置外部文档和 Git 仓库引用以提供更多上下文信息",
    tags: ["reference", "references", "documentation", "context"],
  },
  {
    path: "custom-tools/",
    title: "自定义工具",
    category: "配置",
    description: "自定义工具的创建和配置方法",
    tags: ["custom-tool", "tool", "custom"],
  },

  // ===== 开发相关 =====
  {
    path: "sdk/",
    title: "SDK",
    category: "开发",
    description: "OpenCode SDK 开发指南，用于构建扩展和集成",
    tags: ["sdk", "development", "api", "extension"],
  },
  {
    path: "server/",
    title: "服务器",
    category: "开发",
    description: "OpenCode 服务器部署和配置（opencode serve）",
    tags: ["server", "deploy", "opencode-serve", "hosting"],
  },
  {
    path: "plugins/",
    title: "插件",
    category: "开发",
    description: "插件开发指南——通过自定义工具、钩子和集成扩展 OpenCode",
    tags: ["plugin", "plugins", "extension", "hook", "custom-tool"],
  },
  {
    path: "ecosystem/",
    title: "生态系统",
    category: "开发",
    description: "OpenCode 生态系统概述、社区资源和第三方集成",
    tags: ["ecosystem", "community", "third-party", "integrations"],
  },
];

/** 按分类组织的文档索引 */
export const CATEGORY_INDEX: Record<string, DocPage[]> = {};
for (const page of DOC_PAGES) {
  if (!CATEGORY_INDEX[page.category]) {
    CATEGORY_INDEX[page.category] = [];
  }
  CATEGORY_INDEX[page.category].push(page);
}

/** 分类列表（保持入口页面优先顺序） */
export const CATEGORIES = ["入门", "使用", "配置", "开发"];

/** 路径到页面标题的快速映射 */
export const PATH_TITLE_MAP: Record<string, string> = {};
for (const page of DOC_PAGES) {
  PATH_TITLE_MAP[page.path] = page.title;
}
