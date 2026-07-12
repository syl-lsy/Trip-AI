# API 端点

## 规范

- **基础路径**：`/api`
- **响应格式**：`{ success: boolean, data?: T, error?: string }`
- **认证方式**：`Authorization: Bearer <JWT>`
- **详细文档**：`docs/api/README.md`（含 Apifox 导入指南）
- **接口规范**：`docs/api/openapi.json`（OpenAPI 3.0.3，19 端点）

## 模块总览

| 模块 | 端点数 | 前缀 |
|------|--------|------|
| Auth（认证） | 3 | `/api/auth/*` |
| Itinerary（行程） | 5 | `/api/itineraries/*` |
| Knowledge（知识库） | 3 | `/api/knowledge/*` |
| Destination（目的地） | 3 | `/api/destinations/*` |
| AI（智能 Agent） | 3 | `/api/ai/*` |

> 所有 19 个端点的完整定义见 `docs/api/openapi.json`（可导入 Apifox）。
