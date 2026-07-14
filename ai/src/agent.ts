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

// ─── Streaming with token-level output ─────────────────

// SSE events emitted by this module:
//   progress     → { step, status, message }
//   tool_call    → { tool, status: 'start'|'end', input?, output? }
//   message_chunk → { chunk: string }
//   reasoning    → { content: string }
//   message      → { content: string, knowledgeRefs? }
//   plan         → TripPlan
//   error        → { message: string }

/** Try to parse accumulated text as a JSON array of ContentBlocks */
function tryParseContentBlocks(content: string): { reasoning?: string; text: string } | null {
  const trimmed = content.trim()
  if (!trimmed.startsWith('[')) return null
  try {
    const parsed = JSON.parse(trimmed)
    if (!Array.isArray(parsed)) return null
    const reasoning = parsed.find((b: { type?: string }) => b.type === 'reasoning')?.reasoning as
      string | undefined
    const textBlock = parsed.find(
      (b: { type?: string; text?: string }) => b.type === 'text' && b.text,
    )
    const text = textBlock?.text as string | undefined
    if (reasoning || text)
      return {
        reasoning,
        text:
          text ??
          parsed
            .map((b: { text?: string }) => b.text ?? '')
            .join('')
            .trim(),
      }
    return { text: trimmed }
  } catch {
    return null
  }
}

/** Try to parse content as TripPlan JSON */
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
    onEvent({
      type: 'progress',
      data: { step: info.id, status: 'completed', message: info.message },
    })
  }
}

function emitError(error: unknown, onEvent: (e: SSEEvent) => void, logger: Console): void {
  logger.error('AI error', error)
  onEvent({ type: 'error', data: { message: 'AI 服务暂时不可用，请稍后重试。' } })
}

async function streamWithMessages(
  messages: unknown[],
  onEvent: (e: SSEEvent) => void,
): Promise<void> {
  // Emit step 1 — read request
  onEvent({
    type: 'progress',
    data: { step: 1, status: 'completed', message: '已读取出行需求' },
  })

  const emittedSteps = new Set<StepKey>()
  let accumulatedText = ''

  // Use agent.stream with streamMode "messages" for token-level text + tool results
  // _getType() works on ALL messages (serialized or live), unlike instanceof
  const stream = await tripAgent.stream({ messages }, { streamMode: 'messages', subgraphs: true })

  for await (const rawChunk of stream) {
    // With subgraphs: true, chunk is [namespace, data]
    // With streamMode "messages", data is [messageChunk, metadata]
    const items = (Array.isArray(rawChunk) ? rawChunk : [rawChunk]) as unknown[]
    const data = items.length >= 2 ? items[1] : items[0] // eslint-disable-line no-magic-numbers
    if (!Array.isArray(data) || data.length < 2) continue // eslint-disable-line no-magic-numbers

    const [msg] = data as [unknown, Record<string, unknown>]
    const anyMsg = msg as Record<string, unknown>
    // _getType is a LangChain API method — naming is not our choice

    const msgType = typeof anyMsg._getType === 'function' ? (anyMsg._getType as () => string)() : ''

    // ── 1. AI message — text token OR tool call chunk ──
    if (msgType === 'ai') {
      const textContent = typeof anyMsg.content === 'string' ? anyMsg.content : ''
      // tool_call_chunks is a LangChain message property — naming is not our choice

      const tcChunks = anyMsg.tool_call_chunks as
        { name?: string; args?: string; id?: string }[] | undefined

      // Extract reasoning from additional_kwargs (DeepSeek specific)
      // DeepSeek puts reasoning content in additional_kwargs.reasoning_content
      const kwargs = anyMsg.additional_kwargs as Record<string, unknown> | undefined
      const reasoningContent = kwargs?.reasoning_content
      if (typeof reasoningContent === 'string' && reasoningContent.length > 0) {
        onEvent({ type: 'reasoning', data: { content: reasoningContent } })
      }

      // Pure text token → emit message_chunk (streaming!)
      if (textContent && (!tcChunks || tcChunks.length === 0)) {
        accumulatedText += textContent
        onEvent({ type: 'message_chunk', data: { chunk: textContent } })
      }

      // Tool call being constructed (tool_call_chunks is live ONLY without subgraphs,
      // but we check anyway as a best-effort)
      if (tcChunks && tcChunks.length > 0) {
        for (const tc of tcChunks) {
          if (tc.name) {
            const stepKey = toolStepMapping[tc.name]
            if (stepKey && !emittedSteps.has(stepKey)) {
              emittedSteps.add(stepKey)
              emitProgress(onEvent, stepKey)
            }
            onEvent({
              type: 'tool_call',
              data: { tool: tc.name, status: 'start', input: tc.args ? tryParseJson(tc.args) : {} },
            })
          }
        }
      }
    }

    // ── 2. Tool result ──
    if (msgType === 'tool') {
      const tm = msg as { name?: string; content: string }
      const toolName = tm.name ?? 'unknown'

      // Map to progress step
      const stepKey = toolStepMapping[toolName]
      if (stepKey && !emittedSteps.has(stepKey)) {
        emittedSteps.add(stepKey)
        emitProgress(onEvent, stepKey)
      }

      onEvent({
        type: 'tool_call',
        data: { tool: toolName, status: 'start' },
      })
      onEvent({
        type: 'tool_call',
        data: { tool: toolName, status: 'end', output: tm.content },
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

  // Emit final result: ContentBlock JSON → reasoning + text, or plain text
  if (accumulatedText) {
    const blocks = tryParseContentBlocks(accumulatedText)
    if (blocks) {
      // Reasoning was embedded as ContentBlock JSON in the text
      if (blocks.reasoning) {
        onEvent({ type: 'reasoning', data: { content: blocks.reasoning } })
      }
      const text = blocks.text
      if (text) {
        const plan = tryParsePlan(text)
        if (plan && (text.includes('"days"') || text.includes('"title"'))) {
          onEvent({ type: 'plan', data: plan })
        } else {
          onEvent({ type: 'message', data: { content: text } })
        }
      }
    } else {
      // Plain text — try plan detection
      const plan = tryParsePlan(accumulatedText)
      if (plan && (accumulatedText.includes('"days"') || accumulatedText.includes('"title"'))) {
        onEvent({ type: 'plan', data: plan })
      } else {
        onEvent({ type: 'message', data: { content: accumulatedText } })
      }
    }
  }

  // Complete step 5
  onEvent({
    type: 'progress',
    data: { step: 5, status: 'completed', message: '行程生成完成' },
  })
}

/** Safe JSON.parse that returns object or empty object */
function tryParseJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {}
  }
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
