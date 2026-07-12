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

export class TransportTool {
  async searchFlights(from: string, to: string, date: string): Promise<TransportOption[]> {
    return [
      {
        type: 'flight',
        from,
        to,
        date,
        departureTime: '08:00',
        arrivalTime: '10:30',
        price: 600,
        childFriendly: true,
        notes: ['儿童票5折', '提供儿童餐食'],
        source: 'variflight',
      },
    ]
  }

  async searchTrains(from: string, to: string, date: string): Promise<TransportOption[]> {
    return [
      {
        type: 'train',
        from,
        to,
        date,
        departureTime: '07:30',
        arrivalTime: '12:00',
        price: 200,
        childFriendly: true,
        notes: ['6岁以下免票', '有母婴车厢'],
        source: 'train12306',
      },
    ]
  }
}
