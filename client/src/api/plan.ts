import { post } from './client'
import {
  ROUTES,
  API_PREFIX,
  STORAGE_KEYS,
  SSE_EVENTS,
  SSE_PREFIX_LENGTH,
  TIMEOUT,
} from '@trip/shared'

export type SseEvent =
  | {
      type: typeof SSE_EVENTS.PROGRESS
      data: { step: number; status: 'running' | 'completed' | 'failed'; message?: string }
    }
  | { type: typeof SSE_EVENTS.PLAN; data: unknown }
  | {
      type: typeof SSE_EVENTS.MESSAGE
      data: { content: string; knowledgeRefs?: { id: string; title: string }[] }
    }
  | { type: typeof SSE_EVENTS.REASONING; data: { content: string } }
  | { type: typeof SSE_EVENTS.MESSAGE_CHUNK; data: { chunk: string } }
  | {
      type: typeof SSE_EVENTS.TOOL_CALL
      data: { tool: string; status: 'start' | 'end'; input?: unknown; output?: unknown }
    }
  | { type: typeof SSE_EVENTS.KNOWLEDGE_REF; data: { id: string; title: string } }
  | { type: typeof SSE_EVENTS.ERROR; data: { message: string } }

function createSseFetch(
  url: string,
  body: unknown,
  onEvent: (event: SseEvent) => void,
  onError?: (err: unknown) => void,
  signal?: AbortSignal,
  onComplete?: () => void,
): void {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Timeout after TIMEOUT.SSE ms
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT.SSE)
  const combinedSignal = signal ? combineSignals(signal, controller.signal) : controller.signal

  // Line buffer for cross-chunk SSE rows
  let lineBuffer = ''

  fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: combinedSignal,
  })
    .then(async (response) => {
      const reader = response.body?.getReader()
      if (!reader) {
        clearTimeout(timeoutId)
        return onComplete?.()
      }
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)

        // Append to buffer and split on newlines
        lineBuffer += chunk
        const lines = lineBuffer.split('\n')
        // Keep the last (possibly incomplete) line in the buffer
        lineBuffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(SSE_PREFIX_LENGTH)) as SseEvent
            onEvent(event)
            // Yield to Vue renderer between message_chunk tokens for per-character effect
            if (event.type === 'message_chunk') {
              await new Promise((r) => setTimeout(r, 16))
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      // Process any remaining data in buffer
      if (lineBuffer.startsWith('data: ')) {
        try {
          const event = JSON.parse(lineBuffer.slice(SSE_PREFIX_LENGTH)) as SseEvent
          onEvent(event)
        } catch {
          // skip
        }
      }

      clearTimeout(timeoutId)
      onComplete?.()
    })
    .catch((err) => {
      clearTimeout(timeoutId)
      if (err.name !== 'AbortError') onError?.(err)
    })
}

// Combine two AbortSignals into one
function combineSignals(s1: AbortSignal, s2: AbortSignal): AbortSignal {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  s1.addEventListener('abort', onAbort)
  s2.addEventListener('abort', onAbort)
  // If either signal already aborted, abort immediately
  if (s1.aborted || s2.aborted) controller.abort()
  return controller.signal
}

export const planApi = {
  chat(message: string) {
    return post<never>(ROUTES.AI.CHAT, { message })
  },

  subscribeChat(
    message: string,
    onEvent: (event: SseEvent) => void,
    onError?: (err: unknown) => void,
    onComplete?: () => void,
  ): AbortController {
    const controller = new AbortController()
    createSseFetch(
      `${API_PREFIX}${ROUTES.AI.CHAT}`,
      { message },
      onEvent,
      onError,
      controller.signal,
      onComplete,
    )
    return controller
  },

  subscribePlan(
    requirements: unknown,
    onEvent: (event: SseEvent) => void,
    onError?: (err: unknown) => void,
    onComplete?: () => void,
  ): AbortController {
    const controller = new AbortController()
    createSseFetch(
      `${API_PREFIX}${ROUTES.AI.PLAN}`,
      requirements,
      onEvent,
      onError,
      controller.signal,
      onComplete,
    )
    return controller
  },

  subscribeModify(
    planId: string,
    request: string,
    onEvent: (event: SseEvent) => void,
    onError?: (err: unknown) => void,
    onComplete?: () => void,
  ): AbortController {
    const controller = new AbortController()
    createSseFetch(
      `${API_PREFIX}${ROUTES.AI.MODIFY}`,
      { planId, request },
      onEvent,
      onError,
      controller.signal,
      onComplete,
    )
    return controller
  },
}
