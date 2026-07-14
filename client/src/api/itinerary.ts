import { post, put } from './client'
import { ROUTES } from '@trip/shared'
import type { TripPlan } from '@/stores/plan'

export interface CreateItineraryDto {
  title: string
  destination: string
  startDate?: string
  endDate?: string
  adults?: number
  children?: number
  childAge?: number
  pace?: string
  budget?: number
  itineraryJson?: TripPlan
}

export interface ItineraryResponse {
  id: string
  title: string
  destination: string
  startDate: string | null
  endDate: string | null
  adults: number
  children: number
  childAge: number | null
  pace: string | null
  budget: number | null
  status: string
  kidFriendly: number | null
  itineraryJson: TripPlan | null
  createdAt: string
  updatedAt: string
}

export async function createItinerary(
  dto: CreateItineraryDto,
): Promise<{ success: boolean; data?: ItineraryResponse; error?: string }> {
  return post<ItineraryResponse>(ROUTES.ITINERARIES, dto)
}

export async function updateItinerary(
  id: string,
  dto: Partial<CreateItineraryDto>,
): Promise<{ success: boolean; data?: ItineraryResponse; error?: string }> {
  return put<ItineraryResponse>(`${ROUTES.ITINERARIES}/${id}`, dto)
}
