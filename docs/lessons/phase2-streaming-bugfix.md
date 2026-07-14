# Phase 2 流式 Bug 修复经验教训

## 1. 不要用 `instanceof` 判断反序列化的 LangChain 消息

**问题**：`instanceof AIMessageChunk` / `instanceof ToolMessage` 在跨 subgraph 边界的消息上返回 `false`，导致所有事件分支不执行（工具调用、文本流式、思考过程全部静默丢失）。

**根因**：LangGraph 在子图边界使用 `mapChatMessagesToStoredMessages` → JSON 序列化 → `mapStoredMessagesToChatMessages` 反序列化消息。反序列化的对象不是原始类实例，`instanceof` 返回 `false`。我之前的确认测试证明了这一点。

**正确做法**：使用 `_getType()` 方法，它在所有消息（序列化/反序列化/live）上都可用：

```typescript
// ❌ 错误 — instanceOf 失效
if (token instanceof AIMessageChunk) { ... }

// ✅ 正确 — _getType() 始终可用
const msgType = typeof anyMsg._getType === 'function' ? anyMsg._getType() : ''
if (msgType === 'ai') { ... }
if (msgType === 'tool') { ... }
```

**验证方式**：

```bash
node -e "
const { AIMessageChunk, mapStoredMessagesToChatMessages } = require('@langchain/core/messages');
const stored = { type: 'ai', data: { content: 'hello' } };
const [restored] = mapStoredMessagesToChatMessages([stored]);
console.log('instanceof:', restored instanceof AIMessageChunk);  // false
console.log('_getType:', restored._getType());                    // 'ai'
"
```

---

## 2. 原始对象 vs Vue 3 reactive Proxy

**问题**：`pendingMessage.content += chunk` 不触发 Vue 重新渲染，文本不更新。

**根因**：`messages.value.push(pendingMessage)` 后 Vue 3 将对象包装为 reactive Proxy 存进数组。本地变量 `pendingMessage` 仍然指向原始对象，修改原始对象的属性 Vue 检测不到。

```typescript
// ❌ 错误 — pendingMessage 指向原始对象
const pendingMessage: ChatMessage = { role: 'assistant', content: '' }
messages.value.push(pendingMessage)
// 此时 pendingMessage !== messages.value[lastIdx]（proxy ≠ 原始对象）
pendingMessage.content += chunk // 修改原始对象，Vue 不渲染
```

**正确做法**：push 后立即重新赋值，让 `pendingMessage` 指向 reactive Proxy：

```typescript
// ✅ 正确
let pendingMessage: ChatMessage = { role: 'assistant', content: '' }
messages.value.push(pendingMessage)
pendingMessage = messages.value[messages.value.length - 1]
// 此后 pendingMessage 指向 Proxy，修改 content 触发渲染
pendingMessage.content += chunk // ✅ 响应式
```

---

## 3. 追加 vs 覆盖 reasoning 事件

**问题**：286 个 `reasoning` 事件流过前端，每个覆盖前一个，最后只剩最后一个字符。

**根因**：DeepSeek 推理模型通过 `additional_kwargs.reasoning_content` 将推理内容逐 token 流式输出。每个 token 是一个独立的 SSE `reasoning` 事件。使用赋值操作 `=` 导致每个新 token 覆盖旧 token。

```typescript
// ❌ 错误 — 逐个覆盖，最后只剩最后一个字符
pendingMessage.reasoning = event.data.content

// ✅ 正确 — 逐 token 追加，累积完整思考过程
pendingMessage.reasoning = (pendingMessage.reasoning || '') + event.data.content
```

---

## 4. 序列化保留但易忽略的字段

`mapChatMessagesToStoredMessages` 序列化时保留的字段：

| 字段                 | 跨 subgraph 保留 | 说明                                                       |
| -------------------- | ---------------- | ---------------------------------------------------------- |
| `content`            | ✅               | 标准文本字段，稳定保留                                     |
| `additional_kwargs`  | ✅               | 保留但不一定被检查，DeepSeek 的 `reasoning_content` 在这里 |
| `name` (ToolMessage) | ✅               | 工具名，可用于识别工具调用                                 |
| `_getType()`         | ✅               | 所有消息上都可用，序列化后也正常                           |
| `tool_call_chunks`   | ❌               | 序列化后丢失（`undefined`），不可用于跨子图流判断          |
| `response_metadata`  | ✅               | 保留，但很少使用                                           |

**经验**：始终用 `_getType()` 判断消息类型，用 `name` 识别工具。不要依赖 `tool_call_chunks` 或 `instanceof`。

---

## 5. DeepSeek 的 reasoning 内容来源

DeepSeek 模型有两种输出 reasoning 的方式：

| 模型类型 | 模型名                 | reasoning 来源                                                | 是否可以流式            |
| -------- | ---------------------- | ------------------------------------------------------------- | ----------------------- |
| 推理模型 | `deepseek-reasoner` 等 | `additional_kwargs.reasoning_content`                         | ✅ 逐 token             |
| 聊天模型 | `deepseek-v4-flash` 等 | 通常不产生 reasoning；或通过 ContentBlock JSON 嵌入 `content` | ❌ 需流结束后一次性解析 |

**获取 reasoning 的代码**：

```typescript
// 流式阶段（推理模型用）
const kwargs = anyMsg.additional_kwargs
const reasoningContent = kwargs?.reasoning_content
if (typeof reasoningContent === 'string' && reasoningContent.length > 0) {
  onEvent({ type: 'reasoning', data: { content: reasoningContent } })
}

// 流结束后解析 ContentBlock（聊天模型用）
const trimmed = accumulatedText.trim()
if (trimmed.startsWith('[')) {
  const parsed = JSON.parse(trimmed)
  if (Array.isArray(parsed)) {
    const reasoning = parsed.find((b) => b.type === 'reasoning')?.reasoning
    const text = parsed.find((b) => b.type === 'text')?.text
    console.log({ reasoning, text })
  }
}
```

**经验**：实现前先通过 SSE 调试确认模型产生的实际事件类型和字段名：

```bash
# 用 curl 或浏览器 fetch 捕获 SSE 原始输出
curl -N -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer $(echo $TOKEN)" \
  -H "Content-Type: application/json" \
  -d '{"message":"你好"}' | head -100
```

---

## 6. token 级流式需要在前端主动让出渲染

**问题**：多个 `message_chunk` 事件在同一 microtask 中处理时，Vue 批合成一次 DOM 更新，用户看到文字一起出现。

**解决**：在每个 `message_chunk` 事件后加入 `await new Promise(r => setTimeout(r, 16))`（约 1 帧），让 Vue 有机会渲染每个 token：

```typescript
// client/src/api/plan.ts — createSseFetch 的事件循环
onEvent(event)
if (event.type === 'message_chunk') {
  await new Promise((r) => setTimeout(r, 16))
}
```

---

## 7. 调试 SSE 流的方法

在浏览器中直接捕获 SSE 事件是可以的，不需要安装额外工具：

```javascript
// 在前端控制台执行
async function captureSSE() {
    const response = await fetch('/api/ai/chat', { method: 'POST', headers: {...}, body: ... })
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let result = { eventTypes: {}, total: 0 }

    while (result.total < 100) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        text.split('\n').filter(l => l.startsWith('data: ')).forEach(line => {
            const event = JSON.parse(line.slice(6))
            result.eventTypes[event.type] = (result.eventTypes[event.type] || 0) + 1
            result.total++
        })
    }
    return result
    // → { eventTypes: { progress: 1, message_chunk: 35, reasoning: 286 }, total: 322 }
}
```
