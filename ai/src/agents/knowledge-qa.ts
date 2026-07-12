import type { SSECallback } from '../types'
import { LLM_CONFIG } from '../config/llm'

export class KnowledgeQA {
  async answer(question: string, onEvent?: SSECallback): Promise<string> {
    const response = await LLM_CONFIG.fast.invoke(
      `你是亲子出行知识专家。请回答以下问题，如果不知道请明确告知"暂未收录相关信息"。\n\n问题: ${question}`,
    )
    const answer = response.content as string
    onEvent?.({ type: 'message', data: { content: answer } })
    return answer
  }
}
