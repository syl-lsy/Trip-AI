import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export type SSEEvent = { type: string; data: unknown }
export type SSECallback = (event: SSEEvent) => void

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
      const { streamAgent } = await import('@trip/ai')
      await streamAgent(message, onEvent)
    } catch (error) {
      this.logger.error('AI chat error', error)
      onEvent({ type: 'error', data: { message: 'AI 服务暂时不可用，请稍后重试。' } })
    }
  }

  async plan(requirements: UserRequirements, _userId: string, onEvent: SSECallback) {
    try {
      const { streamPlanner } = await import('@trip/ai')
      await streamPlanner(JSON.stringify(requirements), onEvent)
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

      const { streamModifier } = await import('@trip/ai')
      await streamModifier(itinerary.itineraryJson as never, request, onEvent)
    } catch (error) {
      this.logger.error('AI modify error', error)
      onEvent({ type: 'error', data: { message: '修改服务暂时不可用，请稍后重试。' } })
    }
  }
}
