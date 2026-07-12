---
name: constants-extension
description: >
  Add new constants to the shared @trip/shared package. Use when needing
  centralized values for API paths, storage keys, HTTP status codes,
  timeouts, or error messages. Only for packages/shared/src/constants/
  files. Do NOT use for: modifying business logic, adding UI-specific
  constants that don't need to be shared.
origin: ECC
---

# Constants Extension — 共享常量扩展

## 触发条件

- 用户说"加常量"、"加配置"、"添加到 shared"、"提取硬编码"
- 涉及将字面量提取到 `packages/shared/src/constants/`
- **不要用于**：添加与业务逻辑相关的配置、UI 专属常量

## 执行流程

| #   | 步骤                                                                                                                                 | 验证条件                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| 1   | **确定类别** — API 路径 → `api.ts` / Storage Key → `storage.ts` / HTTP 状态码 → `http.ts` / 超时 → `time.ts` / 错误信息 → `error.ts` | 分类正确                                              |
| 2   | **定位文件** — 打开 `packages/shared/src/constants/<类别>.ts`                                                                        | 文件存在                                              |
| 3   | **添加常量** — 使用 `as const` 断言，`UPPER_CASE` 命名                                                                               | 与同类常量风格一致                                    |
| 4   | **确认导出** — 检查 `packages/shared/src/index.ts` 已导出该文件                                                                      | 默认已导出所有 constants 子模块                       |
| 5   | **更新引用** — 修改业务代码中的硬编码为常量引用                                                                                      | 引用方式：`import { CONST_NAME } from '@trip/shared'` |

## 命名规范

| 类别        | 常量名示例                 | 文件                   |
| ----------- | -------------------------- | ---------------------- |
| API 路径    | `ROUTES.AUTH.SEND_CODE`    | `constants/api.ts`     |
| Storage Key | `STORAGE_KEYS.TOKEN`       | `constants/storage.ts` |
| HTTP 状态码 | `HTTP_STATUS.UNAUTHORIZED` | `constants/http.ts`    |
| 超时时间    | `TIMEOUT.DEFAULT_API`      | `constants/time.ts`    |
| 错误信息    | `ERROR_MSG.NOT_FOUND`      | `constants/error.ts`   |

## 关键约束

- 命名使用 `UPPER_CASE`，对象属性使用 `PascalCase` 分组
- 必须使用 `as const` 断言
- 禁止在业务代码中直接硬编码已存在的常量
- 如果常量涉及时间，使用 `DURATION.xxx` 而非直接写数字

## 验收清单

- [ ] 常量添加在正确的文件中
- [ ] `as const` 已使用
- [ ] 所有硬编码引用已替换为常量
- [ ] `pnpm check` 通过
