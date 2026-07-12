export interface UserRequirements {
  destination: string
  origin?: string
  startDate: string
  endDate: string
  adults: number
  children: number
  childAge: number
  pace: 'relaxed' | 'moderate' | 'intense'
  budget: number
}

export interface IntentResult {
  intent: 'plan' | 'modify' | 'qa'
  confidence: number
  entities?: Partial<UserRequirements>
}

export interface ItineraryNode {
  type: 'transport' | 'accommodation' | 'attraction' | 'dining' | 'rest'
  day: number
  time: string
  title: string
  cost: number
  childFriendly: boolean
  notes: string[]
  knowledgeRefs: string[]
}

export interface DayPlan {
  day: number
  date: string
  paceDescription: string
  nodes: ItineraryNode[]
}

export interface BudgetSummary {
  total: number
  breakdown: {
    transport: number
    accommodation: number
    attractions: number
    dining: number
    other: number
  }
  originalBudget: number
  remaining: number
}

export interface TripPlan {
  title: string
  destination: string
  members: { adults: number; children: number; childAge: number }
  days: DayPlan[]
  budget: BudgetSummary
  kidFriendlyScore: number
}

export interface AgentError {
  node: string
  code: string
  message: string
  recoverable: boolean
}

export interface SSEEvent {
  type: 'progress' | 'message' | 'plan' | 'knowledge_ref' | 'error'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

export type SSECallback = (event: SSEEvent) => void
