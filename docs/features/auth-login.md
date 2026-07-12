---
title: 手机验证码登录
date: 2026-07-12
type: feature
layer: fullstack
---

## 功能概述

实现手机号+验证码登录流程，支持 Demo 用户一键填充。后端签发 JWT（7 天过期），前端存储 token 并附带请求头。

## 变更文件清单

### 后端

| 文件                                         | 操作 | 说明                                                            |
| -------------------------------------------- | ---- | --------------------------------------------------------------- |
| `server/src/prisma/prisma.service.ts`        | 新建 | PrismaClient 封装，使用 PrismaPg 适配器                         |
| `server/src/prisma/prisma.module.ts`         | 新建 | 全局 PrismaModule，导出 PrismaService                           |
| `server/src/auth/auth.module.ts`             | 修改 | JWT secret 从 `.env` 环境变量读取（Phase 1 完善）               |
| `server/src/auth/auth.controller.ts`         | 新建 | `POST /auth/send-code`、`POST /auth/login`、`GET /auth/profile` |
| `server/src/auth/auth.service.ts`            | 新建 | 预设验证码校验、JWT 签发、用户自动创建，返回 `role` 字段        |
| `server/src/auth/dto/send-code.dto.ts`       | 新建 | 手机号校验 `@IsPhoneNumber('CN')`                               |
| `server/src/auth/dto/login.dto.ts`           | 新建 | 手机号 + 验证码校验                                             |
| `server/src/auth/strategies/jwt.strategy.ts` | 修改 | JWT secret 从 `.env` 环境变量读取（Phase 1 完善）               |
| `server/src/common/guards/auth.guard.ts`     | 修改 | 从 stub（始终 true）改为真实 passport JWT 守卫                  |
| `server/src/app.module.ts`                   | 修改 | 导入 PrismaModule + AuthModule                                  |
| `server/src/main.ts`                         | 修改 | 添加 `dotenv/config` 加载 `.env`                                |
| `server/prisma/seed.ts`                      | 修改 | 种子数据：3 个 Demo 用户 + 6 个目的地                           |
| `server/.env.example`                        | 新建 | 环境变量模板（Phase 1 完善）                                    |
| `server/prisma/schema.prisma`                | 修改 | User 模型添加 `role` 字段（Phase 1 完善）                       |

### 前端

| 文件                             | 操作 | 说明                                               |
| -------------------------------- | ---- | -------------------------------------------------- |
| `client/src/App.vue`             | 修改 | 从静态登录页改为 `<router-view />`                 |
| `client/src/api/auth.ts`         | 修改 | 路径改为 `ROUTES.AUTH.*` 常量引用（Phase 1 完善）  |
| `client/src/api/client.ts`       | 修改 | `ApiResponse` 类型从 `@trip/shared` 导入           |
| `client/src/api/types.ts`        | 修改 | 共享类型重导出自 `@trip/shared`（Phase 1 完善）    |
| `client/src/stores/auth.ts`      | 修改 | `User` 类型从 `@trip/shared` 导入                  |
| `client/src/views/LoginView.vue` | 修改 | 手机号输入 + 验证码输入 + Demo 一键填充按钮 2x2    |
| `client/src/router/index.ts`     | 修改 | 添加 `beforeEach` 导航守卫，无 token 跳转 `/login` |

### 基础设施

| 文件                                   | 操作 | 说明                                                                      |
| -------------------------------------- | ---- | ------------------------------------------------------------------------- |
| `packages/shared/package.json`         | 修改 | `exports` 条件导出：`import` → TS 源码（Vite）、`require` → CJS（NestJS） |
| `packages/shared/tsconfig.json`        | 新建 | 编译配置，输出 CJS 到 `dist/`                                             |
| `packages/shared/src/api/types.ts`     | 新建 | 共享 API 类型（`ApiResponse`, `User`, `LoginResult`）（Phase 1 完善）     |
| `packages/shared/src/constants/api.ts` | 修改 | 添加 `ROUTES.AUTH` 路由常量（Phase 1 完善）                               |
| `server/package.json`                  | 修改 | dev 脚本恢复 `nest start --watch`，添加 `predev`                          |
| `package.json`                         | 修改 | `dev` 脚本前先 `dev:shared`（构建 shared 包）                             |
| `.env`                                 | 复制 | 从 `server/.env` 复制到项目根目录                                         |
| `eslint.config.mjs`                    | 修改 | 添加 `setInterval`/`clearInterval` 全局声明                               |

## 关键设计决策

| 决策            | 方案                                                     | 原因                                      |
| --------------- | -------------------------------------------------------- | ----------------------------------------- |
| 验证码方式      | 预设验证码（`123456`/`admin666`）                        | MVP 阶段不接短信网关                      |
| 认证方式        | JWT + passport-jwt                                       | 无状态，与 NestJS 生态集成                |
| prisma 适配     | PrismaPg driver adapter                                  | Prisma 7.x 不再支持无参数构造             |
| 用户注册        | 登录时自动创建                                           | 预设验证码通过即自动注册，无需单独注册页  |
| shared 包双入口 | `exports.import` → TS 源码 / `exports.require` → CJS     | 兼容 Vite（ESM）和 NestJS（CommonJS）     |
| 路由守卫        | `router.beforeEach` 检查 `localStorage` token            | 简单可靠，无需 Pinia 初始化依赖           |
| JWT 密钥来源    | 从 `.env` 环境变量读取（`JWT_SECRET`, `JWT_EXPIRES_IN`） | 避免硬编码，Phase 1 完善                  |
| `role` 字段     | String 类型，默认 `"user"`                               | 支持后续角色权限控制，与 OpenAPI 规范对齐 |
| API 共享类型    | `packages/shared/src/api/types.ts`                       | monorepo 统一类型，前后端共享             |

## 对外变更

### API 端点

| 方法 | 路径                  | 说明                      | 认证 |
| ---- | --------------------- | ------------------------- | ---- |
| POST | `/api/auth/send-code` | 发送验证码                | 否   |
| POST | `/api/auth/login`     | 登录，返回 JWT + 用户信息 | 否   |
| GET  | `/api/auth/profile`   | 获取当前用户信息          | 是   |

### 请求/响应示例

```json
POST /api/auth/login
{"phone": "15250092360", "code": "123456"}

// 200
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "48119576-...",
      "phone": "15250092360",
      "nickname": "亲子用户1",
      "role": "user"
    }
  }
}
```

### Demo 用户

| 手机号      | 验证码   | 昵称       |
| ----------- | -------- | ---------- |
| 15250092360 | 123456   | 亲子用户1  |
| 15370980317 | 123456   | 亲子用户2  |
| 13900139000 | admin666 | 运营管理员 |

### 数据模型变更

| 模型 | 字段        | 类型     | 说明                          |
| ---- | ----------- | -------- | ----------------------------- |
| User | `id`        | UUID     | 主键                          |
| User | `phone`     | String   | 唯一，登录标识                |
| User | `nickname`  | String?  | 昵称                          |
| User | `role`      | String   | 默认 `"user"`，可选 `"admin"` |
| User | `createdAt` | DateTime | 自动                          |
| User | `updatedAt` | DateTime | 自动更新                      |

## 测试结果

- `pnpm lint`：通过
- `pnpm typecheck`：client + server 均通过
- `pnpm -r build`：shared + server(nest) + client(vite) 全部通过
- `pnpm dev`：前后端正常启动，3 个 Auth 端点全部正常返回
- `POST /api/auth/login`：返回包含 `role` 字段的 JWT + 用户信息
- 浏览器访问 `localhost:5173`：自动跳转 `/login`，登录可正常跳转 `/plan`

## 注意事项

- JWT secret 从 `.env` 读取（`JWT_SECRET`），默认 `'trip-planner-secret-key'`，上线前务必更换
- `JWT_EXPIRES_IN` 从 `.env` 读取，默认 `'7d'`
- 预设验证码仅用于 MVP，上线前需集成短信网关
- 修改 `PRESET_CODES` 需更新 `server/src/auth/auth.service.ts` 和 seed 文件
- `.env` 文件在项目根目录和 `server/` 下各一份，保持同步
- 共享 API 类型在 `packages/shared/src/api/types.ts`，前端通过 `@trip/shared` 导入
