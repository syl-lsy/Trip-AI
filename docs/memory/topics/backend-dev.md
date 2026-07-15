# Backend 记忆

最后更新：2026-07-15

## API 设计模式

| 约定      | 内容                                             |
| --------- | ------------------------------------------------ |
| 基础路径  | `/api`                                           |
| 统一响应  | `{success, data?, error?}`                       |
| OpenAPI   | `docs/api/openapi.json` (OpenAPI 3.0.3, 19 端点) |
| Auth 路由 | `ROUTES.AUTH.*` 常量定义路径                     |

## 数据库决策

- Prisma 7.x: 使用 `PrismaPg` driver adapter，不再支持 `new PrismaClient()` 无参数构造
- Prisma 7: 使用 `prisma.config.ts` + `dotenv`，schema 内不写 `datasource.url`
- Prisma 7 迁移 shadow database 需要 vector 扩展 — 在初始 migration.sql 中添加 `CREATE EXTENSION IF NOT EXISTS vector`
- User 模型: 有 `role` 字段（默认 `"user"`）
- Itinerary CRUD: 按 `userId` 隔离，使用 `Prisma.ItineraryCreateInput/UpdateInput` 强类型

## 认证

- 方式: JWT + 手机验证码，无状态认证
- JWT 密钥: 从 `.env` 读取（`JWT_SECRET`, `JWT_EXPIRES_IN`）
- `@nestjs/jwt` 的 `expiresIn` 使用 `ms` 包的 `StringValue` 类型
- `server dev` 脚本: `nest start --watch`

## 共享类型与常量

- 共享类型: `packages/shared/src/api/types.ts`
- 常量路径: `packages/shared/src/constants/`（api/storage/http/time/error）
- shared 包: 需提供 ESM + CJS 双入口 (`exports.import→TS`, `exports.require→CJS`)

## 文件上传

- 端点: `POST /api/user/avatar` (multipart/form-data)
- 存储: `server/uploads/avatars/`
- 数据库: 只存相对路径
- 前端: Pinia store 管理上传状态

## 中间件

- `AuthGuard('jwt')` + `@CurrentUser()` 用于受保护端点
- SSE 端点: `@Sse()` + `Observable`
