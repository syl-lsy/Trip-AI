export const API_PREFIX = '/api'

export const ROUTES = {
  LOGIN: '/login',
  PLAN: '/plan',
  KNOWLEDGE: '/knowledge',
  DESTINATIONS: '/destinations',
  ITINERARIES: '/itineraries',
  AUTH: {
    SEND_CODE: '/auth/send-code',
    LOGIN: '/auth/login',
    PROFILE: '/auth/profile',
  },
  USER: {
    PROFILE_DETAIL: '/user/profile-detail',
  },
  UPLOAD: {
    AVATAR: '/upload/avatar',
  },
} as const

export const CORS = {
  ORIGIN: ['http://localhost:5173'],
} as const

export const PORT = 3000
