import { ROUTES } from '@trip/shared'
import { get } from './client'

export interface UserProfileDetail {
  phone: string
  nickname: string | null
}

export function getProfileDetail() {
  return get<UserProfileDetail>(ROUTES.USER.PROFILE_DETAIL)
}
