import type { EvidenceBackedRelationship } from "@/lib/financial-intelligence/types"

export function pruneLowConfidenceRelationships(
  relationships: EvidenceBackedRelationship[],
  minimumConfidence = 0.65,
) {
  return relationships.filter((relationship) => {
    const isCorrelationOnly = relationship.relationshipType === "market_correlation"
    const hasTraceableEvidence =
      (relationship.evidenceSources?.length ?? 0) > 0 &&
      (relationship.evidenceSnippets?.length ?? 0) > 0
    const hasValidPriceMetadata =
      isCorrelationOnly &&
      relationship.evidenceSources?.includes("price_returns") &&
      (relationship.evidenceSummary?.toLowerCase().includes("correlation") ?? false)

    return (hasTraceableEvidence || hasValidPriceMetadata) && (relationship.confidence ?? 0) >= minimumConfidence
  })
}
