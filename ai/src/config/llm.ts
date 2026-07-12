import { ChatOpenAI } from '@langchain/openai'

export const LLM_CONFIG = {
  fast: new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0.1,
    maxTokens: 500,
  }),
  strong: new ChatOpenAI({
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 2048,
  }),
}
