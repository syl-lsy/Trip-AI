import { LLM_CONFIG } from '../config/llm'
import { INTENT_ROUTER_PROMPT } from '../config/prompts'
import type { IntentResult } from '../types'

export class IntentRouter {
  async classify(message: string): Promise<IntentResult> {
    const prompt = INTENT_ROUTER_PROMPT.replace('{{message}}', message)
    try {
      const response = await LLM_CONFIG.fast.invoke(prompt)
      const parsed = JSON.parse(response.content as string)
      return {
        intent: parsed.intent,
        confidence: parsed.confidence,
        entities: parsed.entities,
      }
    } catch {
      if (
        message.includes('修改') ||
        message.includes('换') ||
        message.includes('加') ||
        message.includes('减')
      )
        return { intent: 'modify', confidence: 0.6 }
      if (
        message.includes('什么') ||
        message.includes('怎么') ||
        message.includes('吗') ||
        message.includes('如何')
      )
        return { intent: 'qa', confidence: 0.6 }
      return { intent: 'plan', confidence: 0.5, entities: { destination: message } }
    }
  }
}
