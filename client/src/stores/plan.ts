import { defineStore } from 'pinia'
import { ref } from 'vue'
import { planApi } from '@/api/plan'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

  function addMessage(msg: ChatMessage) {
    messages.value.push(msg)
    showWelcome.value = false
  }

  function startGeneration(message: string) {
    messages.value.push({ role: 'user', content: message })
    showWelcome.value = false
    isLoading.value = true
    sseError.value = null
    progressSteps.value.forEach((s) => {
      s.status = 'pending'
    })

    abortController = planApi.subscribeChat(
      message,
      (event) => {
        if (event.type === 'progress') {
          const step = progressSteps.value.find((s) => s.id === event.data.step)
          if (step) step.status = event.data.status
        } else if (event.type === 'plan') {
          currentPlan.value = event.data as TripPlan
          isLoading.value = false
          addMessage({ role: 'assistant', content: '行程已生成！你可以查看左侧的行程概览。' })
        } else if (event.type === 'message') {
          isLoading.value = false
          addMessage({
            role: 'assistant',
            content: event.data.content,
            knowledgeRefs: event.data.knowledgeRefs,
          })
        } else if (event.type === 'error') {
          isLoading.value = false
          sseError.value = event.data.message
        }
      },
      () => {
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
    if (!currentPlan.value) return
    if (!itineraryId.value) {
      sseError.value = '请先保存行程后再修改'
      return
    }

    messages.value.push({ role: 'user', content: request })
    isLoading.value = true
    sseError.value = null

    const planId = itineraryId.value!

    abortController = planApi.subscribeModify(
      planId,
      request,
      (event) => {
        if (event.type === 'progress') {
          const step = progressSteps.value.find((s) => s.id === event.data.step)
          if (step) step.status = event.data.status
        } else if (event.type === 'plan') {
          currentPlan.value = event.data as TripPlan
          isLoading.value = false
          addMessage({ role: 'assistant', content: '行程已更新！' })
        } else if (event.type === 'message') {
          isLoading.value = false
          addMessage({
            role: 'assistant',
            content: event.data.content,
            knowledgeRefs: event.data.knowledgeRefs,
          })
        } else if (event.type === 'error') {
          isLoading.value = false
          sseError.value = event.data.message
        }
      },
      () => {
        isLoading.value = false
        sseError.value = '修改失败，请重试'
      },
    )
  }

  function startPlan(requirements: unknown) {
    isLoading.value = true
    sseError.value = null
    progressSteps.value.forEach((s) => {
      s.status = 'pending'
    })

    abortController = planApi.subscribePlan(
      requirements,
      (event) => {
        if (event.type === 'progress') {
          const step = progressSteps.value.find((s) => s.id === event.data.step)
          if (step) step.status = event.data.status
        } else if (event.type === 'plan') {
          currentPlan.value = event.data as TripPlan
          isLoading.value = false
          addMessage({ role: 'assistant', content: '行程已生成！你可以查看左侧的行程概览。' })
        } else if (event.type === 'error') {
          isLoading.value = false
          sseError.value = event.data.message
        }
      },
      () => {
        isLoading.value = false
        sseError.value = '连接失败，请重试'
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
