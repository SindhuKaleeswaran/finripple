import type {
  KnowledgeGraphEntity,
  RelationshipDraft,
  VectorSearchResult,
} from "../types"

type RelationshipExtractorInput = {
  sourceEntity: KnowledgeGraphEntity
  targetEntity: KnowledgeGraphEntity
  evidenceChunks: VectorSearchResult[]
}

type RelationshipRule = {
  relationshipType: string
  riskCategory: string
  direction: string
  keywords: string[]
  explanation: string
}

const relationshipRules: RelationshipRule[] = [
  {
    relationshipType: "supplier_dependency",
    riskCategory: "supply_chain",
    direction: "positive",
    keywords: [
      "supplier",
      "manufacturing partner",
      "foundry",
      "fabrication",
      "outsourced manufacturing",
      "third-party manufacturer",
      "contract manufacturer",
      "semiconductor manufacturing",
    ],
    explanation:
      "Evidence indicates an operating dependency on suppliers, manufacturing partners, foundries, or fabrication capacity.",
  },
  {
    relationshipType: "customer_dependency",
    riskCategory: "customer_concentration",
    direction: "positive",
    keywords: ["customer", "major customer", "revenue from", "accounted for", "sales to"],
    explanation:
      "Evidence indicates customer, sales, or revenue dependency between the entities.",
  },
  {
    relationshipType: "country_exposure",
    riskCategory: "geographic",
    direction: "positive",
    keywords: [
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
    explanation:
      "Evidence indicates geographic operating, manufacturing, demand, or supply-chain exposure.",
  },
  {
    relationshipType: "commodity_dependency",
    riskCategory: "commodity",
    direction: "positive",
    keywords: [
      "oil",
      "crude",
      "natural gas",
      "lithium",
      "rare earth",
      "copper",
      "uranium",
      "battery materials",
    ],
    explanation:
      "Evidence indicates exposure to a commodity input, energy cost, or critical material.",
  },
  {
    relationshipType: "sector_exposure",
    riskCategory: "sector",
    direction: "positive",
    keywords: [
      "semiconductor",
      "artificial intelligence",
      "cloud",
      "electric vehicle",
      "energy",
      "defense",
      "banking",
      "retail",
    ],
    explanation:
      "Evidence indicates sector exposure through products, customers, infrastructure, or end markets.",
  },
  {
    relationshipType: "competitor_similarity",
    riskCategory: "competitive",
    direction: "positive",
    keywords: ["competitor", "competes with", "competition", "peer"],
    explanation:
      "Evidence indicates competitive similarity or peer exposure between the entities.",
  },
]

const targetKeywordOverrides: Record<string, string[]> = {
  CHINA: ["china", "chinese"],
  TAIWAN: ["taiwan", "taiwanese"],
  JAPAN: ["japan", "japanese"],
  SOUTH_KOREA: ["south korea", "korea", "korean"],
  EUROPE: ["europe", "european", "eu"],
  OIL: ["oil", "crude"],
  NATURAL_GAS: ["natural gas", "lng"],
  LITHIUM: ["lithium"],
  RARE_EARTHS: ["rare earth", "rare earths"],
  COPPER: ["copper"],
  URANIUM: ["uranium", "nuclear fuel"],
  SEMICONDUCTORS: ["semiconductor", "semiconductors", "chips"],
  AI_INFRASTRUCTURE: ["artificial intelligence", "ai infrastructure", "accelerated computing", "data center"],
  CLOUD_COMPUTING: ["cloud", "cloud computing", "cloud infrastructure"],
  EV_SECTOR: ["electric vehicle", "ev", "battery electric"],
  ENERGY: ["energy", "oil", "natural gas", "power"],
  DEFENSE: ["defense", "aerospace", "missile", "national security"],
  BANKING: ["banking", "credit", "deposits", "loans"],
  CONSUMER_RETAIL: ["retail", "consumer", "e-commerce", "apparel"],
}

function normalize(value: string) {
  return value.toLowerCase()
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalize(keyword)))
}

function termsFor(entity: KnowledgeGraphEntity) {
  return [
    entity.entityId,
    entity.name,
    entity.ticker ?? "",
    ...(targetKeywordOverrides[entity.entityId] ?? []),
  ]
    .map(normalize)
    .filter(Boolean)
}

function bestEvidenceText(evidenceChunks: VectorSearchResult[]) {
  return evidenceChunks
    .map((result) => result.chunk.text)
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 2500)
}

function evidenceUrls(result: VectorSearchResult) {
  const sourceUrl = result.chunk.metadata.sourceUrl
  return typeof sourceUrl === "string" && sourceUrl.length > 0 ? [sourceUrl] : []
}

function evidenceSnippet(result: VectorSearchResult) {
  return result.chunk.text.slice(0, 500)
}

export class RelationshipExtractor {
  extract({
    sourceEntity,
    targetEntity,
    evidenceChunks,
  }: RelationshipExtractorInput): RelationshipDraft[] {
    if (sourceEntity.entityId === targetEntity.entityId || evidenceChunks.length === 0) {
      return []
    }

    const drafts = new Map<string, RelationshipDraft>()
    const sourceTerms = termsFor(sourceEntity)
    const targetTerms = termsFor(targetEntity)

    for (const result of evidenceChunks) {
      const text = normalize(result.chunk.text)
      const sourceDocumentMatch = result.chunk.metadata.entityId === sourceEntity.entityId
      const sourceMentioned = sourceDocumentMatch || includesAny(text, sourceTerms)
      const targetMentioned = includesAny(text, targetTerms)

      if (!sourceMentioned || !targetMentioned) continue

      for (const rule of relationshipRules) {
        if (!includesAny(text, rule.keywords)) continue

        const key = `${sourceEntity.entityId}:${targetEntity.entityId}:${rule.relationshipType}`
        if (drafts.has(key)) continue

        const rawEvidenceText = bestEvidenceText([result])
        drafts.set(key, {
          sourceEntityId: sourceEntity.entityId,
          targetEntityId: targetEntity.entityId,
          relationshipType: rule.relationshipType,
          riskCategory: rule.riskCategory,
          direction: rule.direction,
          evidenceSummary: `${sourceEntity.entityId} evidence mentions ${targetEntity.entityId} with ${rule.relationshipType.replaceAll("_", " ")} keywords.`,
          evidenceSources: ["sec_filing"],
          evidenceUrls: evidenceUrls(result),
          evidenceSnippets: [evidenceSnippet(result)],
          explanation: rule.explanation,
          rawEvidenceText,
        })
      }
    }

    return Array.from(drafts.values())
  }
}
