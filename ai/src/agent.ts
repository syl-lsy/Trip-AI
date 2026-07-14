import { createDeepAgent, type DeepAgent } from 'deepagents'
import { ChatDeepSeek } from '@langchain/deepseek'
import { HumanMessage, SystemMessage, AIMessageChunk, ToolMessage } from 'langchain'
import type { TripPlan } from './types'
import { searchFlights, searchTrains } from './tools/transport'
import { searchHotels } from './tools/accommodation'
import { searchPOI } from './tools/amap'
import { searchKnowledge } from './tools/knowledge'
import { COORDINATOR_PROMPT, PLANNER_PROMPT, MODIFIER_PROMPT, QA_PROMPT } from './prompts'

type SSEEvent = { type: string; data: unknown }

type ProgressStatus = 'running' | 'completed' | 'failed'

interface ProgressStep {
  step: number
  status: ProgressStatus
  message: string
}

type StepKey = 'readReq' | 'searchTransport' | 'comparePrice' | 'searchPoiHotel' | 'generate'

const STEP_MAP: Record<StepKey, ProgressStep & { id: number }> = {
  readReq: { step: 1, id: 1, status: 'running', message: '已读取出行需求' },
  searchTransport: { step: 2, id: 2, status: 'running', message: '已查询交通信息' },
  comparePrice: { step: 3, id: 3, status: 'running', message: '正在比价航班方案…' },
  searchPoiHotel: { step: 4, id: 4, status: 'running', message: '检索景点与酒店' },
  generate: { step: 5, id: 5, status: 'running', message: '生成每日行程' },
}

// Track tool-to-progress mapping
/* eslint-disable @typescript-eslint/naming-convention */
const toolStepMapping: Record<string, StepKey> = {
  search_flights: 'searchTransport',
  search_trains: 'searchTransport',
  search_hotels: 'searchPoiHotel',
  search_poi: 'searchPoiHotel',
}
/* eslint-enable @typescript-eslint/naming-convention */

const SPACING = 2

const BASE_URL = process.env.OPENCODE_GO_BASE_URL || 'https://opencode.ai/zen/go/v1'

const model = new ChatDeepSeek({
  model: 'deepseek-v4-flash',
  temperature: 0.3,
  maxTokens: 2048,
  configuration: { baseURL: BASE_URL },
})

const tools = [searchFlights, searchTrains, searchHotels, searchPOI, searchKnowledge]

const tripAgent = createDeepAgent({
  model,
  systemPrompt: COORDINATOR_PROMPT,
  tools,
  subagents: [
    {
      name: 'planner',
      description: '生成新的亲子旅行行程计划，需要查询交通、住宿、景点等信息',
      systemPrompt: PLANNER_PROMPT,
      tools: [searchFlights, searchTrains, searchHotels, searchPOI],
    },
    {
      name: 'modifier',
      description: '调整修改已有的旅行行程，根据用户要求调整节奏、预算、住宿等',
      systemPrompt: MODIFIER_PROMPT,
    },
    {
      name: 'qa',
      description: '回答关于亲子出行规划的知识性问题',
      systemPrompt: QA_PROMPT,
    },
  ],
}) as DeepAgent

// ─── Helpers ───────────────────────────────────────────

function tryParsePlan(content: string): TripPlan | null {
  try {
    return JSON.parse(content) as TripPlan
  } catch {
    return null
  }
}

function emitProgress(onEvent: (e: SSEEvent) => void, stepKey: StepKey): void {
  const info = STEP_MAP[stepKey]
  if (!info) return
  onEvent({
    type: 'progress',
    data: { step: info.id, status: 'running', message: info.message },
  })
}

function finalizeProgress(onEvent: (e: SSEEvent) => void, keys: StepKey[]): void {
  for (const key of keys) {
    const info = STEP_MAP[key]
    if (!info) continue
    if (info.status === 'running') {
      onEvent({
        type: 'progress',
        data: { step: info.id, status: 'completed', message: info.message },
      })
    }
  }
}

function emitError(error: unknown, onEvent: (e: SSEEvent) => void, logger: Console): void {
  logger.error('AI error', error)
  onEvent({ type: 'error', data: { message: 'AI 服务暂时不可用，请稍后重试。' } })
}

// ─── Streaming with token-level output ─────────────────

async function streamWithMessages(
  messages: Parameters<typeof tripAgent.stream>[0]['messages'],
  onEvent: (e: SSEEvent) => void,
): Promise<void> {
  // Emit step 1 — read request
  onEvent({
    type: 'progress',
    data: { step: 1, status: 'completed', message: '已读取出行需求' },
  })

  const emittedSteps = new Set<StepKey>()
  let accumulatedContent = ''

  // Stream with messages mode for token-level streaming + tool calls
  const stream = await tripAgent.stream(
    { messages } as Parameters<typeof tripAgent.stream>[0],
    { streamMode: 'messages', subgraphs: true } as Record<string, unknown>,
  )

  for await (const rawChunk of stream) {
    // With subgraphs: true, chunk is [namespace, data]
    // With streamMode "messages", data is [token, metadata]
    const items = (Array.isArray(rawChunk) ? rawChunk : [rawChunk]) as unknown[]
    // items = [namespace, data] when subgraphs: true
    const data = items.length >= 2 ? items[1] : items[0] // eslint-disable-line no-magic-numbers

    // data should be [token, metadata]
    if (!Array.isArray(data) || data.length < 2) continue // eslint-disable-line no-magic-numbers

    const [token] = data as [unknown, Record<string, unknown>]

    // ── 1. AI text token ──
    if (token instanceof AIMessageChunk) {
      const textContent = typeof token.content === 'string' ? token.content : ''
      const toolCallChunks = token.tool_call_chunks ?? []

      // Pure text token
      if (textContent && (!toolCallChunks || toolCallChunks.length === 0)) {
        accumulatedContent += textContent
        onEvent({ type: 'message_chunk', data: { chunk: textContent } })
      }

      // Tool call chunks being constructed
      if (toolCallChunks && toolCallChunks.length > 0) {
        for (const tc of toolCallChunks) {
          if (tc.name) {
            const stepKey = toolStepMapping[tc.name]
            if (stepKey && !emittedSteps.has(stepKey)) {
              emittedSteps.add(stepKey)
              emitProgress(onEvent, stepKey)
            }

            onEvent({
              type: 'tool_call',
              data: {
                tool: tc.name,
                status: 'start',
                input: tc.args ? JSON.parse(tc.args) : {},
              },
            })
          }
        }
      }
    }

    // ── 2. Tool result ──
    if (token instanceof ToolMessage) {
      // Emit comparePrice progress if we had transport tools
      const stepKey = toolStepMapping[token.name ?? '']
      if (stepKey && emittedSteps.has(stepKey)) {
        // Tool finished — will be finalized after all tools
      }

      onEvent({
        type: 'tool_call',
        data: { tool: token.name ?? 'unknown', status: 'end', output: token.content },
      })
    }
  }

  // ── Stream complete — process final result ──
  // Complete tool-related progress steps
  emitProgress(onEvent, 'comparePrice')
  finalizeProgress(onEvent, ['searchTransport', 'comparePrice', 'searchPoiHotel'])

  // Emit step 5 — generating
  onEvent({
    type: 'progress',
    data: { step: 5, status: 'running', message: '生成每日行程' },
  })

  // Try to parse the complete content as a plan
  if (accumulatedContent) {
    const plan = tryParsePlan(accumulatedContent)
    if (plan && (accumulatedContent.includes('"days"') || accumulatedContent.includes('"title"'))) {
      onEvent({ type: 'plan', data: plan })
    } else {
      onEvent({ type: 'message', data: { content: accumulatedContent } })
    }
  }

  // Complete step 5
  onEvent({
    type: 'progress',
    data: { step: 5, status: 'completed', message: '行程生成完成' },
  })
}

// ─── Public API ────────────────────────────────────────

export async function streamAgent(message: string, onEvent: (e: SSEEvent) => void): Promise<void> {
  try {
    await streamWithMessages([new HumanMessage(message)], onEvent)
  } catch (error) {
    emitError(error, onEvent, console)
  }
}

export async function streamPlanner(
  requirements: string,
  onEvent: (e: SSEEvent) => void,
): Promise<void> {
  try {
    await streamWithMessages([new HumanMessage(`请规划行程: ${requirements}`)], onEvent)
  } catch (error) {
    emitError(error, onEvent, console)
  }
}

export async function streamModifier(
  currentPlan: TripPlan,
  request: string,
  onEvent: (e: SSEEvent) => void,
): Promise<void> {
  try {
    await streamWithMessages(
      [
        new SystemMessage(`当前行程:\n${JSON.stringify(currentPlan, null, SPACING)}`),
        new HumanMessage(`请修改行程: ${request}`),
      ],
      onEvent,
    )
  } catch (error) {
    emitError(error, onEvent, console)
  }
}

export async function streamQA(question: string, onEvent: (e: SSEEvent) => void): Promise<void> {
  try {
    await streamWithMessages([new HumanMessage(question)], onEvent)
  } catch (error) {
    emitError(error, onEvent, console)
  }
}

export async function invokeAgent(message: string): Promise<string> {
  const result = await tripAgent.invoke({
    messages: [new HumanMessage(message)],
  })
  const last = result.messages?.[result.messages.length - 1]
  return last?.content?.toString() ?? ''
}

export async function invokePlanner(message: string): Promise<TripPlan> {
  const result = await tripAgent.invoke({
    messages: [new HumanMessage(`请规划行程: ${message}`)],
  })
  const last = result.messages?.[result.messages.length - 1]
  const content = last?.content?.toString() ?? ''
  try {
    return JSON.parse(content) as TripPlan
  } catch {
    throw new Error(`AI 返回格式异常，无法解析为行程计划: ${content.slice(0, 200)}`)
  }
}

export async function invokeModifier(currentPlan: TripPlan, request: string): Promise<TripPlan> {
  const result = await tripAgent.invoke({
    messages: [
      new SystemMessage(`当前行程:\n${JSON.stringify(currentPlan, null, SPACING)}`),
      new HumanMessage(`请修改行程: ${request}`),
    ],
  })
  const last = result.messages?.[result.messages.length - 1]
  const content = last?.content?.toString() ?? ''
  try {
    return JSON.parse(content) as TripPlan
  } catch {
    throw new Error(`AI 修改结果格式异常，无法解析: ${content.slice(0, 200)}`)
  }
}

export async function invokeQA(question: string): Promise<string> {
  const result = await tripAgent.invoke({
    messages: [new HumanMessage(question)],
  })
  const last = result.messages?.[result.messages.length - 1]
  return last?.content?.toString() ?? ''
}
