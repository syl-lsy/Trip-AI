import { ROUTES } from '@trip/shared'
import { post, get } from './client'
import type { LoginResult, User } from '@trip/shared'

export function sendCode(phone: string) {
  return post<null>(ROUTES.AUTH.SEND_CODE, { phone })
}

export function login(phone: string, code: string) {
  return post<LoginResult>(ROUTES.AUTH.LOGIN, { phone, code })
}

export function getProfile() {
  return get<User>(ROUTES.AUTH.PROFILE)
}
