export type { ApiResponse, User, LoginResult } from '@trip/shared'

export interface Itinerary {
  id: string
  userId: string
  title: string
  destination: string
  startDate: string | null
  endDate: string | null
  adults: number
  children: number
  childAge: number | null
  pace: string | null
  budget: number | null
  kidFriendly: number | null
  status: string
  itineraryJson: unknown | null
  createdAt: string
  updatedAt: string
}

export interface Knowledge {
  id: string
  title: string
  summary: string
  category: string
  subCategory: string | null
  ageRange: string | null
  content: string
  tags: string[]
  views: number
  createdAt: string
  updatedAt: string
}

export interface Destination {
  id: string
  name: string
  englishName: string | null
  emoji: string
  region: string
  bestSeason: string
  kidFriendly: number
  tags: string[]
  seasonTags: string[]
  ageRange: string
  knowledgeCount: number
}
