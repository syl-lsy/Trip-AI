---
name: backend-module
description: >
  Create new NestJS backend modules with Prisma, DTOs, and shared types.
  Use when adding database tables, API endpoints, or business logic modules.
  Follows pattern: schema → migration → module/controller/service/dto →
  register → shared types → seed. Do NOT use for: auth/setup/configuration
  changes, or modifying existing modules without adding new tables.
origin: ECC
---

# Backend Module — NestJS 模块创建

## 触发条件

- 用户说"新增 XX 模块"、"创建 XX API"、"实现 XX 服务"、"添加数据库表"
- 涉及新建 Prisma 模型 + NestJS 模块 + API 端点
- **不要用于**：修改已有模块、配置变更、仅 auth 相关

## 执行流程

创建 todowrite 列出以下步骤，逐项执行：

| #   | 步骤                                                                    | 验证条件                       |
| --- | ----------------------------------------------------------------------- | ------------------------------ |
| 1   | **确认模块需求** — 表结构、CRUD 端点、字段类型、API 路径                | 需求清晰可执行                 |
| 2   | **Prisma schema** — 在 `server/prisma/schema.prisma` 添加模型           | 模型完整，含关系、索引、默认值 |
| 3   | **数据库迁移** — `prisma migrate dev --name <描述>` + `prisma generate` | 迁移无错误                     |
| 4   | **NestJS 模块** — 创建 Module → Controller → Service → DTO              | 遵循项目现有模块结构           |
| 5   | **注册模块** — 在 `server/src/app.module.ts` 导入                       | AppModule imports 数组中       |
| 6   | **共享类型** — 在 `packages/shared/src/api/types.ts` 添加接口定义       | 类型与 Prisma 模型一致         |
| 7   | **种子数据** — 更新 `server/prisma/seed.ts`（如需要）                   | 种子数据可正常插入             |

## 关键约束

- Prisma 7.x 使用 **PrismaPg** driver adapter，schema 内不写 `datasource.url`
- 所有 API 响应使用标准格式：`{ success: boolean, data?: T, error?: string }`
- 路由前缀使用 `ROUTES.*` 常量而非硬编码
- shared 类型引用方式：`import type { Xxx } from '@trip/shared'`
- DTO 使用 `class-validator` 装饰器 + `@IsPhoneNumber('CN')` 等具体校验规则
- 新建迁移前先确认现有 migration 是否包含 `CREATE EXTENSION IF NOT EXISTS vector`

## 验收清单

- [ ] `pnpm check` 零错误
- [ ] 所有 API 端点返回 `ApiResponse` 标准格式
- [ ] DTO 包含输入校验
- [ ] shared 类型已添加并导出
- [ ] 路由路径引用 `ROUTES.*` 常量
