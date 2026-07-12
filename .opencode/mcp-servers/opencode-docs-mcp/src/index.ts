#!/usr/bin/env node
/**
 * OpenCode Docs MCP Server
 *
 * 提供 OpenCode 官方中文文档的检索和获取工具。
 * 文档源：https://opencode.ai/docs/zh-cn/
 *
 * 工具列表：
 *   - opencode_list_sections : 列出所有文档章节和页面
 *   - opencode_get_page      : 获取指定文档页面的完整内容
 *   - opencode_search_docs   : 按关键词搜索文档页面
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  DOCS_BASE_URL,
  DOCS_EN_BASE_URL,
  CONFIG_SCHEMA_URL,
  CHARACTER_LIMIT,
  DOC_PAGES,
  CATEGORIES,
  CATEGORY_INDEX,
  PATH_TITLE_MAP,
} from "./constants.js";

// ============================================================
// Shared Utilities
// ============================================================

/** 从 opencode.ai 抓取文档页面内容 */
async function fetchDocPage(path: string, useEn: boolean = false): Promise<string> {
  const baseUrl = useEn ? DOCS_EN_BASE_URL : DOCS_BASE_URL;
  // Normalize path: ensure it doesn't start with /
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `${baseUrl}/${cleanPath}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "OpenCode-Docs-MCP/1.0",
      Accept: "text/html, text/markdown, text/plain",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`页面未找到 (404): ${url}`);
    }
    throw new Error(`获取页面失败 (${response.status}): ${url}`);
  }

  const html = await response.text();
  return extractContentFromHtml(html, cleanPath);
}

/** 从 HTML 中提取主要内容（去除导航、页脚等） */
function extractContentFromHtml(html: string, _path: string): string {
  // 尝试提取 <article> 或 <main> 内容
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const contentMatch = html.match(/<div[^>]*class="[^"]*markdown[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

  let content = "";
  if (articleMatch) {
    content = articleMatch[1];
  } else if (mainMatch) {
    content = mainMatch[1];
  } else if (contentMatch) {
    content = contentMatch[1];
  } else {
    // 兜底：提取 <body> 内容
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      content = bodyMatch[1];
    }
  }

  // 如果提取不到内容，尝试从 meta description 获取摘要
  if (!content || content.length < 50) {
    const metaDesc = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i);
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    if (metaDesc || title) {
      content = `# ${title}\n\n${metaDesc ? `> ${metaDesc[1]}` : ""}`;
    }
  }

  // 清理 HTML 标签，保留文本
  let text = content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "") // 移除所有剩余 HTML 标签
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n") // 合并多个空行
    .trim();

  // 移除"编辑此页"等页脚文本
  text = text.replace(/编辑此页[\s\S]*$/, "").trim();
  text = text.replace(/发现\?提交 issue[\s\S]*$/, "").trim();
  text = text.replace(/加入我们的 Discord[\s\S]*$/, "").trim();
  text = text.replace(/选择语言[\s\S]*$/, "").trim();

  // 截断过长的内容
  if (text.length > CHARACTER_LIMIT) {
    text = text.slice(0, CHARACTER_LIMIT) + `\n\n... (内容已截断，完整内容请访问 ${DOCS_BASE_URL}/${_path})`;
  }

  return text || "无法提取页面内容，建议直接访问官网查看。";
}

/** 构建文档目录的 markdown 字符串 */
function buildSectionsMarkdown(): string {
  const lines: string[] = [
    "# OpenCode 中文文档目录",
    "",
    `文档源: ${DOCS_BASE_URL}`,
    `配置 Schema: ${CONFIG_SCHEMA_URL}`,
    "",
  ];

  for (const category of CATEGORIES) {
    const pages = CATEGORY_INDEX[category];
    if (!pages || pages.length === 0) continue;

    lines.push(`## ${category}`);
    lines.push("");
    for (const page of pages) {
      const url = page.path === "/" ? DOCS_BASE_URL : `${DOCS_BASE_URL}/${page.path}`;
      lines.push(`- **[${page.title}](${url})** — ${page.description}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`共 ${DOC_PAGES.length} 个文档页面`);

  return lines.join("\n");
}

/** 按关键词搜索文档页面 */
function searchPages(query: string): DocSearchResult[] {
  const q = query.toLowerCase();
  const results: DocSearchResult[] = [];

  for (const page of DOC_PAGES) {
    let score = 0;

    // 标题匹配（最高权重）
    if (page.title.toLowerCase().includes(q)) {
      score += 10;
    }

    // 描述匹配
    if (page.description.toLowerCase().includes(q)) {
      score += 5;
    }

    // 标签匹配
    for (const tag of page.tags) {
      if (tag.toLowerCase().includes(q)) {
        score += 3;
      }
    }

    // 分类匹配
    if (page.category.toLowerCase().includes(q)) {
      score += 2;
    }

    if (score > 0) {
      results.push({ page, score });
    }
  }

  // 按匹配度排序
  results.sort((a, b) => b.score - a.score);
  return results;
}

// Search result type
interface DocSearchResult {
  page: (typeof DOC_PAGES)[0];
  score: number;
}

// ============================================================
// MCP Server
// ============================================================

const server = new McpServer({
  name: "opencode-docs",
  version: "1.0.0",
});

// ============================================================
// Tool: opencode_list_sections
// ============================================================

server.registerTool(
  "opencode_list_sections",
  {
    title: "OpenCode 文档章节列表",
    description: `列出 OpenCode 官方中文文档的所有章节和页面。

此工具返回完整的文档目录结构，按分类组织（入门 / 使用 / 配置 / 开发）。
每个条目包含页面标题、URL 和简要描述。

Args:
  - response_format ('markdown' | 'json'): 输出格式 (默认: 'markdown')
    - 'markdown': 返回人类可读的目录文本
    - 'json': 返回结构化 JSON 数据

Examples:
  - 用户说 "OpenCode 有哪些文档" -> 调用此工具
  - 用户说 "如何配置 MCP" -> 先调用此工具找出对应页面 -> 再调用 opencode_get_page
  - 用户说 "文档结构" -> 调用此工具

Error Handling:
  - 此工具不依赖网络请求，仅返回本地索引数据，不会出错

Returns:
  完整的文档目录结构`,
    inputSchema: z
      .object({
        response_format: z
          .enum(["markdown", "json"])
          .default("markdown")
          .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable"),
      })
      .strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params: { response_format: "markdown" | "json" }) => {
    if (params.response_format === "json") {
      const output = {
        total: DOC_PAGES.length,
        categories: CATEGORIES.map((cat) => ({
          name: cat,
          pages: (CATEGORY_INDEX[cat] || []).map((p) => ({
            path: p.path,
            title: p.title,
            description: p.description,
            url: p.path === "/" ? DOCS_BASE_URL : `${DOCS_BASE_URL}/${p.path}`,
          })),
        })),
      };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      };
    }

    return {
      content: [{ type: "text", text: buildSectionsMarkdown() }],
    };
  }
);

// ============================================================
// Tool: opencode_get_page
// ============================================================

server.registerTool(
  "opencode_get_page",
  {
    title: "获取 OpenCode 文档页面",
    description: `获取 OpenCode 官方文档中指定页面的完整内容。

根据 opencode_list_sections 或已知的文档路径，获取某个页面的全部内容。
页面内容从 https://opencode.ai/docs/zh-cn/ 实时抓取。

Args:
  - path (string): 文档页面路径。
    例如: "config/" 对应 https://opencode.ai/docs/zh-cn/config/
    特殊值: "/" 或 "" 对应首页
    常见路径: "config/" "providers/" "agents/" "skills/" "mcp-servers/" "plugins/"
    "permissions/" "commands/" "troubleshooting/" "cli/" "tui/" "sdk/"
  - use_en (boolean): 是否获取英文版 (默认: false)
  - response_format ('markdown' | 'json'): 输出格式 (默认: 'markdown')

Examples:
  - 用户问 "怎么配置 MCP 服务器" -> path="mcp-servers/"
  - 用户问 "opencode.json 的 Schema" -> path="config/"
  - 用户问 "怎么写 SKILL.md" -> path="skills/"
  - 用户问 "如何创建 Agent" -> path="agents/"
  - 用户问 "权限怎么设置" -> path="permissions/"
  - 用户问 "CLI 有哪些命令" -> path="cli/"

Error Handling:
  - 页面不存在 (404): 返回友好提示，建议检查路径
  - 网络错误: 提示用户检查网络连接

Returns:
  文档页面的文本内容`,
    inputSchema: z
      .object({
        path: z
          .string()
          .min(1, "页面路径不能为空")
          .describe("文档页面路径，例如: config/, agents/, mcp-servers/ 等"),
        use_en: z
          .boolean()
          .default(false)
          .describe("是否获取英文版文档 (默认 false 获取中文版)"),
        response_format: z
          .enum(["markdown", "json"])
          .default("markdown")
          .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable"),
      })
      .strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params: { path: string; use_en: boolean; response_format: "markdown" | "json" }) => {
    try {
      const content = await fetchDocPage(params.path, params.use_en);
      const cleanPath = params.path.startsWith("/") ? params.path.slice(1) : params.path;
      const pageUrl = params.use_en
        ? `${DOCS_EN_BASE_URL}/${cleanPath}`
        : `${DOCS_BASE_URL}/${cleanPath}`;
      const title = PATH_TITLE_MAP[cleanPath] || PATH_TITLE_MAP[params.path] || "OpenCode 文档";

      if (params.response_format === "json") {
        const output = {
          title,
          path: cleanPath,
          url: pageUrl,
          content,
          length: content.length,
        };
        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `# ${title}\n\n> 来源: ${pageUrl}\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `获取页面失败: ${errorMsg}\n\n请检查路径是否正确。有效路径示例:\n- 首页: "/" 或 ""\n- 配置: "config/"\n- 代理: "agents/"\n- 技能: "skills/"\n- MCP: "mcp-servers/"\n- 插件: "plugins/"\n- CLI: "cli/"\n\n完整文档目录请使用 opencode_list_sections 查看。`,
          },
        ],
      };
    }
  }
);

// ============================================================
// Tool: opencode_search_docs
// ============================================================

server.registerTool(
  "opencode_search_docs",
  {
    title: "搜索 OpenCode 文档",
    description: `在 OpenCode 官方中文文档中按关键词搜索相关页面。

根据关键词匹配页面标题、描述和标签，返回匹配结果列表。
匹配度高的结果排在前面。

Args:
  - query (string): 搜索关键词。例如: "mcp", "agent", "config", "permission", "plugin" 等
  - response_format ('markdown' | 'json'): 输出格式 (默认: 'markdown')

Examples:
  - 搜索 "mcp" -> 返回 MCP 服务器配置、MCP 相关页面
  - 搜索 "agent" -> 返回 Agent 配置、自定义代理等页面
  - 搜索 "permission" -> 返回权限配置页面
  - 搜索 "plugin" -> 返回插件开发指南
  - 搜索 "skill" -> 返回代理技能编写指南
  - 搜索 "配置" -> 返回所有配置相关的页面

Error Handling:
  - 无匹配结果: 返回 "未找到匹配页面" 的友好提示
  - 搜索词过短: 自动忽略 (< 2 字符)

Returns:
  匹配的文档页面列表，按匹配度排序`,
    inputSchema: z
      .object({
        query: z
          .string()
          .min(1, "搜索关键词不能为空")
          .max(100, "搜索关键词不能超过 100 个字符")
          .describe("搜索关键词，可用于匹配页面标题、描述和标签"),
        category: z
          .enum(["", "入门", "使用", "配置", "开发"])
          .optional()
          .describe("按分类过滤（可选）"),
        response_format: z
          .enum(["markdown", "json"])
          .default("markdown")
          .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable"),
      })
      .strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params: { query: string; category?: string; response_format: "markdown" | "json" }) => {
    let results = searchPages(params.query);

    // 按分类过滤
    if (params.category) {
      results = results.filter((r) => r.page.category === params.category);
    }

    if (results.length === 0) {
      const msg = `未找到与 "${params.query}" 匹配的文档页面。\n\n建议:\n- 尝试使用其他关键词\n- 使用 opencode_list_sections 查看所有文档章节\n- 不同关键词尝试: config, agent, skill, mcp, plugin, permission, cli, provider`;
      return {
        content: [{ type: "text", text: msg }],
      };
    }

    if (params.response_format === "json") {
      const output = {
        query: params.query,
        total: results.length,
        ...(params.category ? { category: params.category } : {}),
        results: results.map((r) => ({
          title: r.page.title,
          path: r.page.path,
          category: r.page.category,
          description: r.page.description,
          url: r.page.path === "/" ? DOCS_BASE_URL : `${DOCS_BASE_URL}/${r.page.path}`,
          score: r.score,
        })),
      };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      };
    }

    const lines: string[] = [
      `# 搜索结果: "${params.query}"`,
      "",
      `找到 ${results.length} 个匹配页面`,
      "",
    ];

    let currentCategory = "";
    for (const result of results) {
      if (result.page.category !== currentCategory) {
        currentCategory = result.page.category;
        lines.push(`## ${currentCategory}`);
        lines.push("");
      }
      const url = result.page.path === "/" ? DOCS_BASE_URL : `${DOCS_BASE_URL}/${result.page.path}`;
      lines.push(`### [${result.page.title}](${url})`);
      lines.push("");
      lines.push(`${result.page.description}`);
      lines.push("");
      lines.push(`> 路径: \`${result.page.path}\` | 匹配度: ${result.score} | 获取内容: \`opencode_get_page(${result.page.path})\``);
      lines.push("");
    }

    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  }
);

// ============================================================
// Main
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenCode Docs MCP server running via stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
