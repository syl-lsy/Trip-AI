import { ROUTES } from '@trip/shared'
import { get } from './client'
import type { UserProfileDetail } from './user'

export function getSettings() {
  return get<UserProfileDetail>(ROUTES.USER.PROFILE_DETAIL)
}
