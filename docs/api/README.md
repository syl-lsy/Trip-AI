---
title: API 文档 — Apifox 导入指南
date: 2026-07-08
status: published
type: guide
author: docs-writer
version: 1.0
---

# API 文档 — Apifox 导入指南

## 文件说明

| 文件 | 说明 |
|------|------|
| `openapi.json` | OpenAPI 3.0.3 规范文件，包含全部 19 个 API 端点 |

## 导入 Apifox

### 方式一：导入 OpenAPI 文件

1. 打开 Apifox → 新建项目 → **导入**
2. 选择 **OpenAPI/Swagger** → **导入文件**
3. 选择 `docs/api/openapi.json`
4. 确认导入，Apifox 将自动解析所有端点、数据模型和文档

### 方式二：拖拽导入

直接将 `openapi.json` 拖入 Apifox 项目窗口即可。

## API 概览

### 认证（Auth）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/send-code` | POST | 发送验证码 |
| `/api/auth/login` | POST | 登录/注册，返回 JWT |
| `/api/auth/profile` | GET | 获取当前用户信息 |

### 行程（Itineraries）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/itineraries` | GET | 列表（支持状态筛选 + 分页） |
| `/api/itineraries` | POST | 新建行程 |
| `/api/itineraries/{id}` | GET | 行程详情 |
| `/api/itineraries/{id}` | PUT | 更新行程 |
| `/api/itineraries/{id}` | DELETE | 删除行程 |
| `/api/itineraries/{id}/status` | PATCH | 更新状态 |

### 知识库（Knowledge）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/knowledge` | GET | 列表（分类/年龄段筛选） |
| `/api/knowledge/categories` | GET | 分类树 |
| `/api/knowledge/search` | GET | 关键词搜索 |
| `/api/knowledge/{id}` | GET | 知识详情 |

### 目的地（Destinations）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/destinations` | GET | 列表（区域/季节/年龄筛选） |
| `/api/destinations/search` | GET | 关键词搜索 |
| `/api/destinations/{id}` | GET | 目的地详情 |

### AI Agent

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/ai/chat` | POST (SSE) | AI 对话 |
| `/api/ai/plan` | POST (SSE) | AI 生成新行程 |
| `/api/ai/modify` | POST (SSE) | AI 修改行程 |

> AI 接口使用 Server-Sent Events (SSE) 协议，Apifox 支持 SSE 预览。

## 数据模型

所有 API 响应使用统一格式：

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

包含的 Schema：
- **User** — 用户（手机号、角色）
- **Itinerary** — 行程（含完整行程 JSON）
- **ItineraryNode** — 行程节点（交通/景点/餐饮/住宿/休息）
- **Knowledge / KnowledgeDetail** — 知识条目
- **Destination** — 目的地
- **Category** — 分类树
- **ChatMessage** — 对话消息
- **SseEvent** — SSE 事件

## 认证

所有需要认证的接口使用 Bearer JWT：

```
Authorization: Bearer <token>
```

Token 通过 `/api/auth/login` 接口获取。
