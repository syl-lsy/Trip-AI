import { tool } from 'langchain'
import { z } from 'zod'

export interface TransportOption {
  type: 'flight' | 'train' | 'driving'
  from: string
  to: string
  date: string
  departureTime: string
  arrivalTime: string
  price: number
  childFriendly: boolean
  notes: string[]
  source: string
}

export const searchFlights = tool(
  async ({ origin, destination, date }) => {
    return [
      {
        type: 'flight' as const,
        from: origin,
        to: destination,
        date,
        departureTime: '08:00',
        arrivalTime: '10:30',
        price: 600,
        childFriendly: true,
        notes: ['儿童票5折', '提供儿童餐食'],
        source: 'variflight',
      },
    ]
  },
  {
    name: 'search_flights',
    description: '查询航班信息，返回航班列表',
    schema: z.object({
      origin: z.string().describe('出发城市'),
      destination: z.string().describe('目的城市'),
      date: z.string().describe('出发日期 YYYY-MM-DD'),
    }),
  },
)

export const searchTrains = tool(
  async ({ origin, destination, date }) => {
    return [
      {
        type: 'train' as const,
        from: origin,
        to: destination,
        date,
        departureTime: '07:30',
        arrivalTime: '12:00',
        price: 200,
        childFriendly: true,
        notes: ['6岁以下免票', '有母婴车厢'],
        source: 'train12306',
      },
    ]
  },
  {
    name: 'search_trains',
    description: '查询高铁/火车信息，返回车次列表',
    schema: z.object({
      origin: z.string().describe('出发城市'),
      destination: z.string().describe('目的城市'),
      date: z.string().describe('出发日期 YYYY-MM-DD'),
    }),
  },
)
