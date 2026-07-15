# Frontend 记忆

最后更新：2026-07-15

## 组件约定

- 技术栈: Vue 3 Composition API + `<script setup>` + TypeScript
- 组件/页面命名: PascalCase
- 文件命名: kebab-case
- Pinia Store: `useXxxStore` 格式
- vue-tsc: `--noEmit` 替代 `-b` 避免生成 `.d.ts` 文件污染

## UI 模式

- 设计 Token: primary=`#4A90D9`, accent=`#F5A623`, success=`#7EB8A0`, danger=`#EF4444`, bg-base=`#FFFBF5`
- Tailwind v4: `@import "tailwindcss"` + `@theme` 指令
- Phase 2 三栏布局: PlanView 使用 `fixed` 定位 (`inset-0 top-14`) 突破 DefaultLayout 的 `max-w-7xl` 约束
- SSE 流式渲染: 原生 `fetch` + `ReadableStream`，SSE_PREFIX_LENGTH 常量避免 magic number
- 方案对比弹窗: `Teleport` 弹窗

## Phase 2 规划工作台组件树

- `PlanView` (三栏容器) → `ChatPanel` + `OutlineSidebar` + `TimelineCenter`
- `ChatPanel` → `ProgressSkeleton` + `QuickActions` + `KnowledgeRefCard`
- `TimelineCenter` → `DayCard` → `TimelineNode`
- `OutlineSidebar` → `PlanComparison`

## 共享常量引用

- API 路径: `ROUTES.AI.*` 常量
- SSE 事件: `SSE_EVENTS.*`, `SSE_STATUS.*`, `SSE_TOOL_STATUS.*`
- Storage Key: `STORAGE_KEYS.*`
