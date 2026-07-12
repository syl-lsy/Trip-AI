import { post, get } from './client'
import type { User } from './types'

export interface LoginResult {
  token: string
  user: User
}

export function sendCode(phone: string) {
  return post<null>('/auth/send-code', { phone })
}

export function login(phone: string, code: string) {
  return post<LoginResult>('/auth/login', { phone, code })
}

export function getProfile() {
  return get<User>('/auth/profile')
}
