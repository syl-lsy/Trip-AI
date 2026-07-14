import { defineStore } from 'pinia'
import { ref } from 'vue'
import { planApi } from '@/api/plan'
import { createItinerary, updateItinerary } from '@/api/itinerary'
import { SSE_EVENTS } from '@trip/shared'

export interface ToolCallInfo {
  tool: string
  status: 'start' | 'end'
  input?: unknown
  output?: unknown
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  toolCalls?: ToolCallInfo[]
  knowledgeRefs?: { id: string; title: string }[]
}

export interface TripPlan {
  title: string
  destination: string
  members: { adults: number; children: number; childAge: number }
  days: DayPlan[]
  budget: BudgetSummary
  kidFriendlyScore: number
}

export interface DayPlan {
  day: number
  date: string
  paceDescription: string
  nodes: ItineraryNode[]
}

export interface ItineraryNode {
  type: 'transport' | 'accommodation' | 'attraction' | 'dining' | 'rest'
  day: number
  time: string
  title: string
  cost: number
  childFriendly: boolean
  notes: string[]
  knowledgeRefs: string[]
}

export interface BudgetSummary {
  total: number
  breakdown: {
    transport: number
    accommodation: number
    attractions: number
    dining: number
    other: number
  }
  originalBudget: number
  remaining: number
}

export interface ProgressStep {
  id: number
  label: string
  status: 'pending' | 'running' | 'completed' | 'failed'
}

const MAX_MESSAGES = 100

export const usePlanStore = defineStore('plan', () => {
  const currentPlan = ref<TripPlan | null>(null)
  const itineraryId = ref<string | null>(null)
  const messages = ref<ChatMessage[]>([])
  const showWelcome = ref(true)
  const isLoading = ref(false)
  const sseError = ref<string | null>(null)

  const progressSteps = ref<ProgressStep[]>([
    { id: 1, label: '已读取出行需求', status: 'pending' },
    { id: 2, label: '已查询交通信息', status: 'pending' },
    { id: 3, label: '正在比价航班方案…', status: 'pending' },
    { id: 4, label: '检索景点与酒店', status: 'pending' },
    { id: 5, label: '生成每日行程', status: 'pending' },
  ])

  let abortController: AbortController | null = null
  let currentGenerationId = 0

  function guardGenId(genId: number): boolean {
    if (genId !== currentGenerationId) return false
    return true
  }

  function addMessage(msg: ChatMessage) {
    messages.value.push(msg)
    if (messages.value.length > MAX_MESSAGES) {
      messages.value.splice(0, messages.value.length - MAX_MESSAGES)
    }
    showWelcome.value = false
  }

  function startGeneration(message: string) {
    // Cancel any existing stream first
    cancelGeneration()

    currentGenerationId++
    const genId = currentGenerationId

    messages.value.push({ role: 'user', content: message })
    showWelcome.value = false
    isLoading.value = true
    sseError.value = null
    progressSteps.value.forEach((s) => {
      s.status = 'pending'
    })

    const pendingMessage: ChatMessage = { role: 'assistant', content: '' }
    let isAssistantMessageAdded = false

    abortController = planApi.subscribeChat(
      message,
      (event) => {
        if (!guardGenId(genId)) return
        if (event.type === SSE_EVENTS.MESSAGE || event.type === SSE_EVENTS.PLAN) {
          isLoading.value = false
          pendingMessage.content =
            event.type === SSE_EVENTS.MESSAGE
              ? event.data.content
              : '行程已生成！你可以查看左侧的行程概览。'
          if (event.type === SSE_EVENTS.MESSAGE && event.data.knowledgeRefs) {
            pendingMessage.knowledgeRefs = event.data.knowledgeRefs
          }
          if (!isAssistantMessageAdded) {
            messages.value.push(pendingMessage)
            isAssistantMessageAdded = true
          }
        } else if (event.type === SSE_EVENTS.REASONING) {
          pendingMessage.reasoning = event.data.content
          if (!isAssistantMessageAdded) {
            messages.value.push(pendingMessage)
            isAssistantMessageAdded = true
          }
        } else if (event.type === SSE_EVENTS.TOOL_CALL) {
          if (!pendingMessage.toolCalls) pendingMessage.toolCalls = []
          const existing = pendingMessage.toolCalls.find((t) => t.tool === event.data.tool)
          if (existing) {
            existing.status = event.data.status
            if (event.data.input) existing.input = event.data.input
            if (event.data.output) existing.output = event.data.output
          } else {
            pendingMessage.toolCalls.push({
              tool: event.data.tool,
              status: event.data.status,
              input: event.data.input,
              output: event.data.output,
            })
          }
        } else if (event.type === SSE_EVENTS.PROGRESS) {
          const step = progressSteps.value.find((s) => s.id === event.data.step)
          if (step) step.status = event.data.status
        } else if (event.type === SSE_EVENTS.ERROR) {
          isLoading.value = false
          sseError.value = event.data.message
        }
      },
      () => {
        if (!guardGenId(genId)) return
        isLoading.value = false
        sseError.value = '连接失败，请重试'
      },
    )
  }

  function cancelGeneration() {
    abortController?.abort()
    abortController = null
    isLoading.value = false
    progressSteps.value.forEach((s) => {
      s.status = 'pending'
    })
  }

  function modifyPlan(request: string) {
    if (!currentPlan.value) {
      isLoading.value = false
      return
    }
    if (!itineraryId.value) {
      isLoading.value = false
      sseError.value = '请先保存行程后再修改'
      return
    }

    currentGenerationId++
    const genId = currentGenerationId

    messages.value.push({ role: 'user', content: request })
    isLoading.value = true
    sseError.value = null

    const pendingMessage: ChatMessage = { role: 'assistant', content: '' }
    let isAssistantMessageAdded = false

    abortController = planApi.subscribeModify(
      itineraryId.value,
      request,
      (event) => {
        if (!guardGenId(genId)) return
        if (event.type === SSE_EVENTS.MESSAGE || event.type === SSE_EVENTS.PLAN) {
          isLoading.value = false
          if (event.type === SSE_EVENTS.PLAN) {
            currentPlan.value = event.data as TripPlan
            pendingMessage.content = '行程已更新！'
          } else {
            pendingMessage.content = event.data.content
          }
          if (!isAssistantMessageAdded) {
            messages.value.push(pendingMessage)
            isAssistantMessageAdded = true
          }
        } else if (event.type === SSE_EVENTS.REASONING) {
          pendingMessage.reasoning = event.data.content
          if (!isAssistantMessageAdded) {
            messages.value.push(pendingMessage)
            isAssistantMessageAdded = true
          }
        } else if (event.type === SSE_EVENTS.TOOL_CALL) {
          if (!pendingMessage.toolCalls) pendingMessage.toolCalls = []
          const existing = pendingMessage.toolCalls.find((t) => t.tool === event.data.tool)
          if (existing) {
            existing.status = event.data.status
            if (event.data.input) existing.input = event.data.input
            if (event.data.output) existing.output = event.data.output
          } else {
            pendingMessage.toolCalls.push({
              tool: event.data.tool,
              status: event.data.status,
              input: event.data.input,
              output: event.data.output,
            })
          }
        } else if (event.type === SSE_EVENTS.PROGRESS) {
          const step = progressSteps.value.find((s) => s.id === event.data.step)
          if (step) step.status = event.data.status
        } else if (event.type === SSE_EVENTS.ERROR) {
          isLoading.value = false
          sseError.value = event.data.message
        }
      },
      () => {
        if (!guardGenId(genId)) return
        isLoading.value = false
        sseError.value = '修改失败，请重试'
      },
      () => {
        if (!guardGenId(genId)) return
        // onComplete: auto-save updated plan
        if (currentPlan.value && itineraryId.value) {
          updateItinerary(itineraryId.value, { itineraryJson: currentPlan.value }).catch(() => {
            sseError.value = '自动保存失败'
          })
        }
      },
    )
  }

  function autoSavePlan() {
    const plan = currentPlan.value
    if (!plan) return

    createItinerary({
      title: plan.title,
      destination: plan.destination,
      adults: plan.members.adults,
      children: plan.members.children,
      childAge: plan.members.childAge,
      budget: plan.budget.total,
      itineraryJson: plan,
    })
      .then((res) => {
        if (res.success && res.data) {
          itineraryId.value = res.data.id
        }
      })
      .catch(() => {
        sseError.value = '自动保存失败，修改将不可用'
      })
  }

  function startPlan(requirements: unknown) {
    cancelGeneration()

    currentGenerationId++
    const genId = currentGenerationId

    isLoading.value = true
    sseError.value = null
    progressSteps.value.forEach((s) => {
      s.status = 'pending'
    })

    const pendingMessage: ChatMessage = { role: 'assistant', content: '' }
    let isAssistantMessageAdded = false

    abortController = planApi.subscribePlan(
      requirements,
      (event) => {
        if (!guardGenId(genId)) return
        if (event.type === SSE_EVENTS.PLAN) {
          currentPlan.value = event.data as TripPlan
          isLoading.value = false
          pendingMessage.content = '行程已生成！你可以查看左侧的行程概览。'
          if (!isAssistantMessageAdded) {
            messages.value.push(pendingMessage)
            isAssistantMessageAdded = true
          }
        } else if (event.type === SSE_EVENTS.MESSAGE) {
          isLoading.value = false
          pendingMessage.content = event.data.content
          if (!isAssistantMessageAdded) {
            messages.value.push(pendingMessage)
            isAssistantMessageAdded = true
          }
        } else if (event.type === SSE_EVENTS.REASONING) {
          pendingMessage.reasoning = event.data.content
          if (!isAssistantMessageAdded) {
            messages.value.push(pendingMessage)
            isAssistantMessageAdded = true
          }
        } else if (event.type === SSE_EVENTS.TOOL_CALL) {
          if (!pendingMessage.toolCalls) pendingMessage.toolCalls = []
          const existing = pendingMessage.toolCalls.find((t) => t.tool === event.data.tool)
          if (existing) {
            existing.status = event.data.status
            if (event.data.input) existing.input = event.data.input
            if (event.data.output) existing.output = event.data.output
          } else {
            pendingMessage.toolCalls.push({
              tool: event.data.tool,
              status: event.data.status,
              input: event.data.input,
              output: event.data.output,
            })
          }
        } else if (event.type === SSE_EVENTS.PROGRESS) {
          const step = progressSteps.value.find((s) => s.id === event.data.step)
          if (step) step.status = event.data.status
        } else if (event.type === SSE_EVENTS.ERROR) {
          isLoading.value = false
          sseError.value = event.data.message
        }
      },
      () => {
        if (!guardGenId(genId)) return
        isLoading.value = false
        sseError.value = '连接失败，请重试'
      },
      () => {
        if (!guardGenId(genId)) return
        // onComplete: auto-save the plan if we have one and no itineraryId yet
        if (currentPlan.value && !itineraryId.value) {
          autoSavePlan()
        }
      },
    )
  }

  return {
    currentPlan,
    itineraryId,
    messages,
    showWelcome,
    isLoading,
    sseError,
    progressSteps,
    addMessage,
    startGeneration,
    cancelGeneration,
    startPlan,
    modifyPlan,
  }
})
