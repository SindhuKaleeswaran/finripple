export type EntityType = "company" | "etf" | "commodity" | "country" | "sector"

export type KnowledgeGraphEntity = {
  entityId: string
  name: string
  type: EntityType
  ticker: string | null
  cik: string | null
  description: string
}

export type NormalizedEntity = KnowledgeGraphEntity & {
  entityType: EntityType
}

export type EvidenceSourceType =
  | "sec_filing"
  | "etf_holdings"
  | "price_returns"
  | "news"

export type EvidenceDocument = {
  entityId: string
  sourceType: EvidenceSourceType
  text: string
  status: "loaded" | "missing"
  metadata: {
    path: string
    sourceUrl?: string
    filingDate?: string
    accessionNumber?: string
    [key: string]: unknown
  }
}

export type TextChunk<Metadata extends Record<string, unknown> = Record<string, unknown>> = {
  chunkId: string
  text: string
  metadata: Metadata
}

export type VectorSearchResult = {
  chunk: TextChunk
  score: number
}

export type RelationshipDraft = {
  sourceEntityId: string
  targetEntityId: string
  relationshipType: string
  riskCategory: string
  direction: string
  evidenceSummary: string
  evidenceSources: EvidenceSourceType[]
  evidenceUrls: string[]
  evidenceSnippets: string[]
  explanation: string
  rawEvidenceText: string
}

export type ScoredRelationship = RelationshipDraft & {
  strength: number
  confidence: number
}

export type FinalRelationship = ScoredRelationship & {
  relationshipId: string
}
