import { post } from './client'
import { ROUTES, API_PREFIX, STORAGE_KEYS, SSE_EVENTS, SSE_PREFIX_LENGTH } from '@trip/shared'

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

  fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  })
    .then(async (response) => {
      const reader = response.body?.getReader()
      if (!reader) return onComplete?.()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const event = JSON.parse(line.slice(SSE_PREFIX_LENGTH)) as SseEvent
            onEvent(event)
          } catch {
            // skip malformed lines
          }
        }
      }
      onComplete?.()
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError?.(err)
    })
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
