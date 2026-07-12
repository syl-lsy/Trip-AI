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
