---
name: prisma-operations
description: >
  Manage Prisma schema changes, migrations, seeds, and type generation.
  Use when modifying database schema, running migrations, or updating seed
  data. Handles Prisma 7.x specifics (PrismaPg adapter, pgvector, shadow
  database). Do NOT use for: reading data, querying the database, or
  non-Prisma database tools.
origin: ECC
---

# Prisma Operations — 数据库操作

## 触发条件

- 用户说"加表"、"改字段"、"迁移"、"prisma"、"migrate"、"seed"
- 涉及 Prisma schema 修改、迁移创建、种子数据更新
- **不要用于**：SQL 查询、pgAdmin 操作、只读查看数据库

## 执行流程

| #   | 步骤                                                                   | 验证条件                                         |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | **修改 schema** — 在 `server/prisma/schema.prisma` 添加/修改模型       | 注意 pgvector 类型为 `Unsupported("vector(n)")?` |
| 2   | **创建迁移** — `pnpm --filter server prisma:migrate --name <英文描述>` | 迁移无错误，shadow DB 需要 pgvector 扩展         |
| 3   | **生成客户端** — `pnpm --filter server prisma:generate`                | Prisma Client 生成成功                           |
| 4   | **种子数据** — 更新 `server/prisma/seed.ts`（如需要）                  | 种子数据可正常插入                               |
| 5   | **共享类型** — 更新 `packages/shared/src/api/types.ts` 对应接口        | 类型与 Prisma 模型一致                           |
| 6   | **工程门禁** — `pnpm check` 验证                                       | lint + typecheck + build 全通过                  |

## 关键约束

- Prisma 7.x 使用 `prisma.config.ts` + `dotenv`，schema 内不写 `datasource.url`
- pgvector 类型的模型，migration SQL 需要 `CREATE EXTENSION IF NOT EXISTS vector`
- shadow database 也需要 pgvector 扩展，否则 migration 会失败
- 迁移描述使用英文短句，如 `add_user_role`、`create_trip_table`
- 迁移后检查 schema 和 Prisma Client 类型是否一致

## 验收清单

- [ ] migration 创建成功
- [ ] prisma generate 无错误
- [ ] seed 数据可正常插入
- [ ] pnpm check 通过
