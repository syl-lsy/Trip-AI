import { safeReplace } from '../utils'
import type { UserRequirements, TripPlan, SSECallback } from '../types'
import { TransportTool } from '../tools/transport'
import { AccommodationTool } from '../tools/accommodation'
import { AmapTool } from '../tools/amap'
import { LLM_CONFIG } from '../config/llm'
import { TRAVEL_PLANNER_PROMPT } from '../config/prompts'

export class TravelPlanner {
  async plan(requirements: UserRequirements, onEvent?: SSECallback): Promise<TripPlan> {
    const transport = new TransportTool()
    const accommodation = new AccommodationTool()
    const amap = new AmapTool()

    onEvent?.({
      type: 'progress',
      data: { step: 1, status: 'completed', message: '已读取出行需求' },
    })

    const [flights, trains, hotels] = await Promise.all([
      transport.searchFlights(
        requirements.origin || '上海',
        requirements.destination,
        requirements.startDate,
      ),
      transport.searchTrains(
        requirements.origin || '上海',
        requirements.destination,
        requirements.startDate,
      ),
      accommodation.search(requirements.destination, requirements.childAge),
    ])
    onEvent?.({
      type: 'progress',
      data: { step: 2, status: 'completed', message: '已查询交通信息' },
    })
    onEvent?.({
      type: 'progress',
      data: { step: 3, status: 'completed', message: '已查询住宿信息' },
    })

    const pois = await amap.searchPOI(requirements.destination, '亲子')
    onEvent?.({
      type: 'progress',
      data: { step: 4, status: 'completed', message: '已检索景点与酒店' },
    })

    const prompt = safeReplace(TRAVEL_PLANNER_PROMPT, {
      requirements: JSON.stringify(requirements),
      transportOptions: JSON.stringify([...flights, ...trains]),
      accommodationOptions: JSON.stringify(hotels),
      attractionOptions: JSON.stringify(pois),
    })

    onEvent?.({
      type: 'progress',
      data: { step: 5, status: 'running', message: '正在生成每日行程…' },
    })

    const response = await LLM_CONFIG.strong.invoke(prompt)
    let plan: TripPlan
    try {
      plan = JSON.parse(response.content as string) as TripPlan
    } catch {
      onEvent?.({ type: 'error', data: { message: '行程生成格式异常，请重试。' } })
      throw new Error('Failed to parse LLM response as TripPlan')
    }

    onEvent?.({ type: 'progress', data: { step: 5, status: 'completed', message: '行程生成完成' } })
    onEvent?.({ type: 'plan', data: plan })

    return plan
  }

  async modify(currentPlan: TripPlan, request: string, onEvent?: SSECallback): Promise<TripPlan> {
    const prompt = safeReplace(TRAVEL_PLANNER_PROMPT, {
      currentPlan: JSON.stringify(currentPlan),
      request,
    })

    const response = await LLM_CONFIG.strong.invoke(prompt)
    let plan: TripPlan
    try {
      plan = JSON.parse(response.content as string) as TripPlan
    } catch {
      onEvent?.({ type: 'error', data: { message: '修改结果格式异常，请重试。' } })
      throw new Error('Failed to parse LLM response as TripPlan')
    }
    onEvent?.({ type: 'plan', data: plan })
    return plan
  }
}
