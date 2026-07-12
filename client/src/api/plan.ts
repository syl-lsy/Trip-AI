import { post } from './client'
import { ROUTES, API_PREFIX, STORAGE_KEYS } from '@trip/shared'

const SSE_PREFIX_LENGTH = 6

export type SseEvent =
  | {
      type: 'progress'
      data: { step: number; status: 'running' | 'completed' | 'failed'; message?: string }
    }
  | { type: 'plan'; data: unknown }
  | { type: 'message'; data: { content: string; knowledgeRefs?: { id: string; title: string }[] } }
  | { type: 'knowledge_ref'; data: { id: string; title: string } }
  | { type: 'error'; data: { message: string } }

function createSseFetch(
  url: string,
  body: unknown,
  onEvent: (event: SseEvent) => void,
  onError?: (err: unknown) => void,
  signal?: AbortSignal,
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
      if (!reader) return
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
  ): AbortController {
    const controller = new AbortController()
    createSseFetch(
      `${API_PREFIX}${ROUTES.AI.CHAT}`,
      { message },
      onEvent,
      onError,
      controller.signal,
    )
    return controller
  },

  subscribePlan(
    requirements: unknown,
    onEvent: (event: SseEvent) => void,
    onError?: (err: unknown) => void,
  ): AbortController {
    const controller = new AbortController()
    createSseFetch(`${API_PREFIX}/ai/plan`, requirements, onEvent, onError, controller.signal)
    // TODO: 改用 ROUTES.AI.PLAN 常量
    return controller
  },

  subscribeModify(
    planId: string,
    request: string,
    onEvent: (event: SseEvent) => void,
    onError?: (err: unknown) => void,
  ): AbortController {
    const controller = new AbortController()
    createSseFetch(
      `${API_PREFIX}${ROUTES.AI.MODIFY}`,
      { planId, request },
      onEvent,
      onError,
      controller.signal,
    )
    return controller
  },
}
