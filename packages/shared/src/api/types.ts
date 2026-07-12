export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface User {
  id: string
  phone: string
  nickname: string | null
  role: string
  createdAt: string
}

export interface LoginResult {
  token: string
  user: User
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
  createdAt: string
  updatedAt: string
}
