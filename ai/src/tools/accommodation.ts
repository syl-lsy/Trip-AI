import { tool } from 'langchain'
import { z } from 'zod'

export const searchHotels = tool(
  async ({ destination }: { destination: string }) => {
    return [
      {
        name: `${destination}亲子酒店`,
        type: 'hotel' as const,
        location: destination,
        checkIn: '14:00',
        checkOut: '12:00',
        pricePerNight: 400,
        kidFriendly: 8,
      },
      {
        name: `${destination}舒适民宿`,
        type: 'homestay' as const,
        location: destination,
        checkIn: '15:00',
        checkOut: '11:00',
        pricePerNight: 250,
        kidFriendly: 7,
      },
    ]
  },
  {
    name: 'search_hotels',
    description: '查询目的地的酒店/民宿信息',
    schema: z.object({
      destination: z.string().describe('目的地城市'),
    }),
  },
)
