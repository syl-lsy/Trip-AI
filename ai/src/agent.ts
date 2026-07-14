import { createDeepAgent, type DeepAgent } from 'deepagents'
import { ChatDeepSeek } from '@langchain/deepseek'
import { HumanMessage, SystemMessage } from 'langchain'
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

// Track which tool steps have been emitted to avoid duplicates
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

interface ContentBlock {
  type: string
  text?: string
  reasoning?: string
}

function getContentBlocks(state: Record<string, unknown>): ContentBlock[] {
  const messages = state.messages as { content?: unknown }[]
  const last = messages?.[messages.length - 1]
  const raw = last?.content

  if (!raw) return []

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as ContentBlock[]
    } catch {
      // plain string, treat as single text block
    }
    return [{ type: 'text', text: raw }]
  }

  if (Array.isArray(raw)) return raw as ContentBlock[]

  return [{ type: 'text', text: String(raw) }]
}

function extractReasoning(blocks: ContentBlock[]): string | undefined {
  return blocks.find((b) => b.type === 'reasoning')?.reasoning
}

function extractText(blocks: ContentBlock[]): string {
  const text = blocks.find((b) => b.type === 'text' && b.text)
  if (text?.text) return text.text

  const joined = blocks
    .map((b) => b.text || '')
    .join('')
    .trim()
  return joined || ''
}

function tryParsePlan(content: string): TripPlan | null {
  try {
    return JSON.parse(content) as TripPlan
  } catch {
    return null
  }
}

function emitResult(blocks: ContentBlock[], onEvent: (e: SSEEvent) => void): void {
  const reasoning = extractReasoning(blocks)
  const text = extractText(blocks)

  if (reasoning) {
    onEvent({ type: 'reasoning', data: { content: reasoning } })
  }

  const plan = tryParsePlan(text)
  if (plan && (text.includes('"days"') || text.includes('"title"'))) {
    onEvent({ type: 'plan', data: plan })
  } else if (text) {
    onEvent({ type: 'message', data: { content: text } })
  }
}

function emitError(error: unknown, onEvent: (e: SSEEvent) => void, logger: Console): void {
  logger.error('AI error', error)
  onEvent({ type: 'error', data: { message: 'AI 服务暂时不可用，请稍后重试。' } })
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

async function streamWithEvents(
  run: {
    toolCalls: AsyncIterable<{ name: string; input: unknown; output: Promise<unknown> }>
    output: Promise<Record<string, unknown>>
  },
  onEvent: (e: SSEEvent) => void,
): Promise<void> {
  // Emit initial progress: step 1 quickly
  onEvent({
    type: 'progress',
    data: { step: 1, status: 'completed', message: '已读取出行需求' },
  })

  const emittedSteps = new Set<StepKey>()

  const toolPromise = (async () => {
    for await (const call of run.toolCalls) {
      onEvent({ type: 'tool_call', data: { tool: call.name, status: 'start', input: call.input } })

      // Emit progress mapped from tool name
      const stepKey = toolStepMapping[call.name]
      if (stepKey && !emittedSteps.has(stepKey)) {
        emittedSteps.add(stepKey)
        emitProgress(onEvent, stepKey)
      }

      try {
        const output = await call.output
        onEvent({ type: 'tool_call', data: { tool: call.name, status: 'end', output } })
      } catch {
        onEvent({ type: 'tool_call', data: { tool: call.name, status: 'end' } })
      }
    }
  })()

  const textPromise = (async () => {
    const state = await run.output
    const blocks = getContentBlocks(state)

    // Emit running for steps that may not have been triggered by tools
    emitProgress(onEvent, 'comparePrice')
    // Complete all tool-related steps before emitting result
    finalizeProgress(onEvent, ['searchTransport', 'comparePrice', 'searchPoiHotel'])

    // Emit step 5 (generating)
    onEvent({
      type: 'progress',
      data: { step: 5, status: 'running', message: '生成每日行程' },
    })

    emitResult(blocks, onEvent)

    // Complete step 5
    onEvent({
      type: 'progress',
      data: { step: 5, status: 'completed', message: '行程生成完成' },
    })
  })()

  await Promise.all([toolPromise, textPromise])
}

export async function streamAgent(message: string, onEvent: (e: SSEEvent) => void): Promise<void> {
  try {
    const run = await tripAgent.streamEvents(
      { messages: [new HumanMessage(message)] },
      { version: 'v3' },
    )
    await streamWithEvents(run, onEvent)
  } catch (error) {
    emitError(error, onEvent, console)
  }
}

export async function streamPlanner(
  requirements: string,
  onEvent: (e: SSEEvent) => void,
): Promise<void> {
  try {
    const run = await tripAgent.streamEvents(
      { messages: [new HumanMessage(`请规划行程: ${requirements}`)] },
      { version: 'v3' },
    )
    await streamWithEvents(run, onEvent)
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
    const run = await tripAgent.streamEvents(
      {
        messages: [
          new SystemMessage(`当前行程:\n${JSON.stringify(currentPlan, null, SPACING)}`),
          new HumanMessage(`请修改行程: ${request}`),
        ],
      },
      { version: 'v3' },
    )
    await streamWithEvents(run, onEvent)
  } catch (error) {
    emitError(error, onEvent, console)
  }
}

export async function streamQA(question: string, onEvent: (e: SSEEvent) => void): Promise<void> {
  try {
    const run = await tripAgent.streamEvents(
      { messages: [new HumanMessage(question)] },
      { version: 'v3' },
    )
    await streamWithEvents(run, onEvent)
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
