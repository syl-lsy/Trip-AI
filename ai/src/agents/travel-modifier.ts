import { safeReplace } from '../utils'
import type { TripPlan, SSECallback } from '../types'
import { LLM_CONFIG } from '../config/llm'
import { TRAVEL_MODIFIER_PROMPT } from '../config/prompts'

export class TravelModifier {
  async modify(currentPlan: TripPlan, request: string, onEvent?: SSECallback): Promise<TripPlan> {
    const prompt = safeReplace(TRAVEL_MODIFIER_PROMPT, {
      currentPlan: JSON.stringify(currentPlan),
      request,
    })

    const response = await LLM_CONFIG.strong.invoke(prompt)
    let modified: TripPlan
    try {
      modified = JSON.parse(response.content as string) as TripPlan
    } catch {
      onEvent?.({ type: 'error', data: { message: '修改结果格式异常，请重试。' } })
      throw new Error('Failed to parse LLM response as TripPlan')
    }
    onEvent?.({ type: 'plan', data: modified })
    return modified
  }
}
