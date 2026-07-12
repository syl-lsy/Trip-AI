export interface POIResult {
  name: string
  category: string
  duration: string
  price: number
  kidFriendly: number
  notes: string[]
}

export class AmapTool {
  async searchPOI(destination: string, _keyword: string): Promise<POIResult[]> {
    return [
      {
        name: `${destination}海滩`,
        category: '景点',
        duration: '3小时',
        price: 0,
        kidFriendly: 9,
        notes: ['适合儿童玩沙', '免费开放'],
      },
    ]
  }

  async planRoute(_origin: string, _destination: string): Promise<Record<string, unknown>> {
    return { distance: '300km', duration: '3h', route: [] }
  }
}
