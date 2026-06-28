import type { EvidenceBackedRelationship, EvidenceSourceType } from "@/lib/financial-intelligence/types"
import type { Relationship } from "@/lib/ripple-engine"

const SOURCE_RELIABILITY: Record<EvidenceSourceType, number> = {
  sec_filing: 0.95,
  etf_holdings: 1,
  price_returns: 0.75,
  news: 0.7,
}

function clamp(value: number, min = 0.1, max = 1) {
  return Math.max(min, Math.min(max, value))
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100
}

export function scoreEvidenceRelationship(
  relationship: Relationship,
  sourceTypes: EvidenceSourceType[],
  semanticScore: number,
): EvidenceBackedRelationship {
  const sourceReliability = Math.max(...sourceTypes.map((sourceType) => SOURCE_RELIABILITY[sourceType] ?? 0.5))
  const evidenceCount = relationship.evidenceSnippets?.length ?? 0
  const evidenceScore = clamp(0.35 + semanticScore * 0.35 + Math.min(evidenceCount, 4) * 0.08)
  const marketCorrelation =
    sourceTypes.includes("price_returns") || relationship.relationshipType === "market_correlation"
      ? relationship.strength
      : 0.5
  const confidence = roundTwo(
    clamp(0.42 * sourceReliability + 0.34 * evidenceScore + 0.16 * marketCorrelation + 0.08 * relationship.strength),
  )
  const strength = roundTwo(clamp(0.45 * relationship.strength + 0.3 * evidenceScore + 0.15 * sourceReliability + 0.1 * marketCorrelation))

  return {
    ...relationship,
    strength,
    confidence,
    graphSource: "dynamic_evidence",
    evidenceScore: roundTwo(evidenceScore),
    sourceReliability: roundTwo(sourceReliability),
    marketCorrelation: roundTwo(marketCorrelation),
  }
}

export function scorePersistentRelationship(relationship: Relationship): EvidenceBackedRelationship {
  const confidence = relationship.confidence ?? 0.6
  const evidenceScore = relationship.evidenceSnippets?.length ? 0.72 : 0.45

  return {
    ...relationship,
    graphSource: "persistent_graph",
    evidenceScore,
    sourceReliability: 0.68,
    marketCorrelation: relationship.relationshipType === "market_correlation" ? relationship.strength : 0.45,
    confidence,
  }
}
