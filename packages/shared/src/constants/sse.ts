export const SSE_EVENTS = {
  PROGRESS: 'progress',
  PLAN: 'plan',
  MESSAGE: 'message',
  MESSAGE_CHUNK: 'message_chunk',
  ERROR: 'error',
  REASONING: 'reasoning',
  TOOL_CALL: 'tool_call',
  KNOWLEDGE_REF: 'knowledge_ref',
} as const

export const SSE_STATUS = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PENDING: 'pending',
} as const

export const SSE_TOOL_STATUS = {
  START: 'start',
  END: 'end',
} as const

export const SSE_PREFIX_LENGTH = 6
