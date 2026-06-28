import type { EvidenceSourceType, RelationshipDraft, ScoredRelationship } from "../types"

const sourceReliabilityByType: Record<EvidenceSourceType, number> = {
  sec_filing: 0.95,
  etf_holdings: 1,
  price_returns: 0.75,
  news: 0.7,
}

const clarityKeywordsByType: Record<string, string[]> = {
  supplier_dependency: [
    "supplier",
    "manufacturing partner",
    "foundry",
    "fabrication",
    "outsourced manufacturing",
    "third-party manufacturer",
    "contract manufacturer",
    "semiconductor manufacturing",
  ],
  customer_dependency: ["customer", "major customer", "revenue from", "accounted for", "sales to"],
  country_exposure: [
    "china",
    "taiwan",
    "japan",
    "korea",
    "europe",
    "international operations",
    "manufacturing in",
    "operations in",
    "supply chain in",
  ],
  commodity_dependency: [
    "oil",
    "crude",
    "natural gas",
    "lithium",
    "rare earth",
    "copper",
    "uranium",
    "battery materials",
  ],
  sector_exposure: [
    "semiconductor",
    "artificial intelligence",
    "cloud",
    "electric vehicle",
    "energy",
    "defense",
    "banking",
    "retail",
  ],
  competitor_similarity: ["competitor", "competes with", "competition", "peer"],
}

function clamp(value: number) {
  return Math.max(0.1, Math.min(1, value))
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100
}

function countMatches(text: string, keywords: string[]) {
  return keywords.filter((keyword) => text.includes(keyword.toLowerCase())).length
}

export class RelationshipScorer {
  score(draft: RelationshipDraft): ScoredRelationship {
    const evidenceText = `${draft.evidenceSummary} ${draft.rawEvidenceText}`.toLowerCase()
    const clarityKeywords = clarityKeywordsByType[draft.relationshipType] ?? []
    const matchCount = countMatches(evidenceText, clarityKeywords)

    const evidenceStrength = clamp(0.35 + matchCount * 0.18)
    const sourceReliability = Math.max(
      ...draft.evidenceSources.map((source) => sourceReliabilityByType[source] ?? 0.5),
    )
    const sourceMentioned =
      evidenceText.includes(draft.sourceEntityId.toLowerCase()) ||
      draft.evidenceSummary.includes(draft.sourceEntityId)
    const targetMentioned =
      evidenceText.includes(draft.targetEntityId.toLowerCase()) ||
      draft.evidenceSummary.includes(draft.targetEntityId)
    const specificity = sourceMentioned && targetMentioned ? 0.95 : targetMentioned ? 0.7 : 0.45
    const relationshipClarity = clamp(0.35 + matchCount * 0.22)

    const strength = roundTwo(
      clamp(
        0.35 * evidenceStrength +
          0.25 * sourceReliability +
          0.2 * specificity +
          0.2 * relationshipClarity,
      ),
    )
    const confidence = roundTwo(
      clamp(0.4 * sourceReliability + 0.25 * specificity + 0.35 * relationshipClarity),
    )

    return {
      ...draft,
      strength,
      confidence,
    }
  }
}
