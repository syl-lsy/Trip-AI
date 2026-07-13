import { tool } from 'langchain'
import { z } from 'zod'

export const searchPOI = tool(
  async ({ destination }: { destination: string }) => {
    return [
      {
        name: `${destination}海滩`,
        category: '景点',
        duration: '3小时',
        price: 0,
        kidFriendly: 9,
        notes: ['适合儿童玩沙', '免费开放'],
      },
      {
        name: `${destination}动物园`,
        category: '景点',
        duration: '4小时',
        price: 60,
        kidFriendly: 8,
        notes: ['有儿童互动区'],
      },
    ]
  },
  {
    name: 'search_poi',
    description: '查询目的地的景点/POI信息',
    schema: z.object({
      destination: z.string().describe('目的地城市'),
    }),
  },
)
