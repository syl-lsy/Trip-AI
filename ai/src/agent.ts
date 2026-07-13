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

function extractContent(state: Record<string, unknown>): string {
  const messages = state.messages as { content?: string }[]
  const last = messages?.[messages.length - 1]
  return last?.content ?? ''
}

function tryParsePlan(content: string): TripPlan | null {
  try {
    return JSON.parse(content) as TripPlan
  } catch {
    return null
  }
}

function emitResult(content: string, onEvent: (e: SSEEvent) => void): void {
  const plan = tryParsePlan(content)
  if (plan && (content.includes('"days"') || content.includes('"title"'))) {
    onEvent({ type: 'plan', data: plan })
  } else {
    onEvent({ type: 'message', data: { content } })
  }
}

function emitError(error: unknown, onEvent: (e: SSEEvent) => void, logger: Console): void {
  logger.error('AI error', error)
  onEvent({ type: 'error', data: { message: 'AI 服务暂时不可用，请稍后重试。' } })
}

export async function streamAgent(message: string, onEvent: (e: SSEEvent) => void): Promise<void> {
  try {
    const run = await tripAgent.streamEvents(
      { messages: [new HumanMessage(message)] },
      { version: 'v3' },
    )
    const state = await run.output
    emitResult(extractContent(state), onEvent)
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
    const state = await run.output
    const content = extractContent(state)
    const plan = tryParsePlan(content)
    if (plan) {
      onEvent({ type: 'plan', data: plan })
    } else {
      onEvent({ type: 'error', data: { message: '行程生成格式异常，请重试。' } })
    }
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
    const state = await run.output
    const content = extractContent(state)
    const plan = tryParsePlan(content)
    if (plan) {
      onEvent({ type: 'plan', data: plan })
    } else {
      onEvent({ type: 'error', data: { message: '修改结果格式异常，请重试。' } })
    }
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
    const state = await run.output
    emitResult(extractContent(state), onEvent)
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
  return JSON.parse(content) as TripPlan
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
  return JSON.parse(content) as TripPlan
}

export async function invokeQA(question: string): Promise<string> {
  const result = await tripAgent.invoke({
    messages: [new HumanMessage(question)],
  })
  const last = result.messages?.[result.messages.length - 1]
  return last?.content?.toString() ?? ''
}
