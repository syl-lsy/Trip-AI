import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export type SSECallback = (event: { type: string; data: unknown }) => void

export interface UserRequirements {
  destination: string
  origin?: string
  startDate: string
  endDate: string
  adults: number
  children: number
  childAge: number
  pace: 'relaxed' | 'moderate' | 'intense'
  budget: number
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)

  constructor(private readonly prisma: PrismaService) {}

  async chat(message: string, onEvent: SSECallback) {
    try {
      const { IntentRouter, TravelPlanner, KnowledgeQA } = await import('@trip/ai')

      const router = new IntentRouter()
      const result = await router.classify(message)

      if (result.intent === 'plan') {
        const planner = new TravelPlanner()
        const requirements: UserRequirements = {
          destination: result.entities?.destination || '三亚',
          startDate: result.entities?.startDate || new Date().toISOString().split('T')[0],
          endDate: result.entities?.endDate || '',
          adults: result.entities?.adults || 2,
          children: result.entities?.children || 1,
          childAge: result.entities?.childAge || 5,
          pace: result.entities?.pace || 'moderate',
          budget: result.entities?.budget || 10000,
        }
        await planner.plan(requirements, onEvent)
      } else if (result.intent === 'qa') {
        const qa = new KnowledgeQA()
        await qa.answer(message, onEvent)
      } else {
        onEvent({ type: 'message', data: { content: '请先创建一个行程，再进行修改。' } })
      }
    } catch (error) {
      this.logger.error('AI chat error', error)
      onEvent({ type: 'error', data: { message: 'AI 服务暂时不可用，请稍后重试。' } })
    }
  }

  async plan(requirements: UserRequirements, _userId: string, onEvent: SSECallback) {
    try {
      const { TravelPlanner } = await import('@trip/ai')
      const planner = new TravelPlanner()
      await planner.plan(requirements, onEvent)
    } catch (error) {
      this.logger.error('AI plan error', error)
      onEvent({ type: 'error', data: { message: '规划服务暂时不可用，请稍后重试。' } })
    }
  }

  async modify(planId: string, request: string, userId: string, onEvent: SSECallback) {
    try {
      const itinerary = await this.prisma.itinerary.findFirst({ where: { id: planId, userId } })
      if (!itinerary || !itinerary.itineraryJson) {
        onEvent({ type: 'error', data: { message: '行程未找到或尚未生成。' } })
        return
      }

      const { TravelModifier } = await import('@trip/ai')
      const modifier = new TravelModifier()
      await modifier.modify(itinerary.itineraryJson as never, request, onEvent)
    } catch (error) {
      this.logger.error('AI modify error', error)
      onEvent({ type: 'error', data: { message: '修改服务暂时不可用，请稍后重试。' } })
    }
  }
}
