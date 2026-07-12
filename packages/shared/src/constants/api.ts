export const API_PREFIX = '/api'

export const ROUTES = {
  LOGIN: '/login',
  PLAN: '/plan',
  KNOWLEDGE: '/knowledge',
  DESTINATIONS: '/destinations',
  ITINERARIES: '/itineraries',
} as const

export const CORS = {
  ORIGIN: ['http://localhost:5173'],
} as const

export const PORT = 3000
