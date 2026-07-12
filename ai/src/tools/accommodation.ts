export interface AccommodationOption {
  name: string
  type: 'hotel' | 'homestay'
  location: string
  checkIn: string
  checkOut: string
  pricePerNight: number
  kidFriendly: number
}

export class AccommodationTool {
  async search(destination: string, _childAge: number): Promise<AccommodationOption[]> {
    return [
      {
        name: `${destination}亲子酒店`,
        type: 'hotel',
        location: destination,
        checkIn: '14:00',
        checkOut: '12:00',
        pricePerNight: 400,
        kidFriendly: 8,
      },
    ]
  }
}
