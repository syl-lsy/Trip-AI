import { tool } from 'langchain'
import { z } from 'zod'

export const searchKnowledge = tool(
  async ({ query: _query }: { query: string }) => {
    return []
  },
  {
    name: 'search_knowledge',
    description: '搜索亲子出行知识库，返回相关知识条目',
    schema: z.object({
      query: z.string().describe('搜索关键词'),
    }),
  },
)
