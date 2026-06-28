import type { Relationship } from "@/lib/ripple-engine"
import type { HistoricalAnalogy } from "@/lib/historical-memory"

export type EntityType = "company" | "etf" | "commodity" | "country" | "sector"

export type KnowledgeEntity = {
  entityId: string
  name: string
  type: EntityType
  entityType?: EntityType
  ticker: string | null
  cik: string | null
  description: string
}

export type FinancialEvent = {
  query: string
  eventId: string
  severity: number
  primaryEntityIds: string[]
  mentionedEntityIds: string[]
  themes: string[]
}

export type EvidenceSourceType = "sec_filing" | "news" | "etf_holdings" | "price_returns"

export type EvidenceChunk = {
  chunkId: string
  text: string
  sourceType: EvidenceSourceType
  sourceEntityId?: string
  sourceUrl?: string
  title?: string
  path?: string
  metadata?: Record<string, unknown>
}

export type EvidenceSearchResult = {
  chunk: EvidenceChunk
  score: number
}

export type EvidenceBackedRelationship = Relationship & {
  relationshipId?: string
  graphSource: "dynamic_evidence" | "persistent_graph" | "scenario_hypothesis"
  evidenceScore: number
  sourceReliability: number
  marketCorrelation: number
}

export type DynamicKnowledgeGraph = {
  event: FinancialEvent
  entities: KnowledgeEntity[]
  relationships: EvidenceBackedRelationship[]
  evidence: EvidenceSearchResult[]
}

export type HistoricalEventMatch = {
  title: string
  period: string
  score: number
  summary: string
  sourceEntityIds: string[]
}

export type SimulationExplanation = {
  headline: string
  confidence: number
  bulletPoints: string[]
  historicalMatches: HistoricalEventMatch[]
}

export type IntelligenceSimulationResult = {
  scenario: string
  startEntityIds: string[]
  architecture: string[]
  evidenceSummary: {
    retrievedChunks: number
    evidenceBackedEdges: number
    scenarioHypothesisEdges: number
    persistentDynamoEdges: number
    finalEdges: number
    dynamicRelationships: number
    dynamoDbRelationships: number
    persistentRelationshipsMerged: number
    mergedRelationships: number
    prunedRelationships: number
  }
  explanation: SimulationExplanation
  historicalAnalogies: HistoricalAnalogy[]
  result: {
    nodes: import("@/lib/ripple-engine").RippleNode[]
    edges: import("@/lib/ripple-engine").RippleEdge[]
    topImpacted: import("@/lib/ripple-engine").RippleNode[]
  }
}
