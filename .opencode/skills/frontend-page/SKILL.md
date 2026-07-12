---
name: frontend-page
description: >
  Create new Vue 3 frontend pages with routing, navigation, API layer, and
  store integration. Use when adding views, routes, or page-level components.
  Follows pattern: view → route → nav → API → store. Do NOT use for:
  simple component changes, CSS-only edits, or modifying existing pages
  without adding new routes.
origin: ECC
---

# Frontend Page — Vue 页面创建

## 触发条件

- 用户说"新建 XX 页面"、"添加 XX 路由"、"实现 XX 视图"
- 涉及新增 Vue view + 路由 + 导航 + API 调用
- **不要用于**：修改已有页面样式（CSS）、修复组件内逻辑、配置变更

## 执行流程

创建 todowrite 列出以下步骤，逐项执行：

| #   | 步骤                                                                                       | 验证条件                       |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------ |
| 1   | **创建 View** — 在 `client/src/views/XxxView.vue`，使用 Composition API + `<script setup>` | 遵循现有页面模式               |
| 2   | **注册路由** — 在 `client/src/router/index.ts`，懒加载 + 守卫检查                          | 路由 path 使用 `ROUTES.*` 常量 |
| 3   | **添加导航项** — 在 `client/src/layouts/DefaultLayout.vue` 的导航菜单                      | 图标 + 文字 + 路由链接         |
| 4   | **API 调用层** — 在 `client/src/api/xxx.ts` 封装请求函数                                   | 路径引用 `ROUTES.*` 常量       |
| 5   | **Pinia Store** — 更新或新建 store 文件（如需持久化数据）                                  | 遵循 `useXxxStore` 命名规范    |

## 关键约束

- 始终使用 **Composition API + `<script setup>`**，禁止 Options API
- 路由**懒加载**：`component: () => import('@/views/XxxView.vue')`
- API 路径引用 `ROUTES.*` 常量，禁止硬编码字符串
- 类型从 `@trip/shared` 或 `@/api/types` 导入
- 导航守卫由全局 `beforeEach` 处理，页面内不需要重复检查
- `ApiResponse<T>` 类型从 `@trip/shared` 导入

## 验收清单

- [ ] 页面可正常访问（路由正确）
- [ ] API 调用返回数据显示正常
- [ ] 导航项高亮状态正确
- [ ] 无硬编码路径（全部使用 `ROUTES.*` 常量）
- [ ] `vue-tsc --noEmit` 类型检查通过
