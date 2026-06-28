import type {
  DynamicKnowledgeGraph,
  EvidenceBackedRelationship,
  EvidenceSearchResult,
  EvidenceSourceType,
  FinancialEvent,
  KnowledgeEntity,
} from "@/lib/financial-intelligence/types"
import { cleanSnippet } from "@/lib/financial-intelligence/retrieval/evidence-cleaning"
import { scoreEvidenceRelationship } from "@/lib/financial-intelligence/scoring/relationship-scorer"
import type { Relationship } from "@/lib/ripple-engine"

const RELATIONSHIP_RULES = [
  {
    relationshipType: "supplier_dependency",
    riskCategory: "supply_chain",
    keywords: ["supplier", "foundry", "fabrication", "manufacturing partner", "contract manufacturer", "supply chain"],
    explanation: "Evidence indicates a supplier, manufacturing, or production dependency.",
    validTargetTypes: ["company", "country", "sector", "commodity"],
  },
  {
    relationshipType: "commodity_dependency",
    riskCategory: "commodity",
    keywords: ["oil", "crude", "lithium", "rare earth", "copper", "uranium", "fuel", "battery materials"],
    explanation: "Evidence indicates exposure to a commodity input or price driver.",
    validTargetTypes: ["commodity"],
  },
  {
    relationshipType: "country_exposure",
    riskCategory: "geographic",
    keywords: ["china", "taiwan", "japan", "korea", "europe", "international", "export", "tariff", "restriction"],
    explanation: "Evidence indicates geographic exposure through operations, demand, regulation, or supply chain.",
    validTargetTypes: ["country"],
  },
  {
    relationshipType: "sector_exposure",
    riskCategory: "sector",
    keywords: ["semiconductor", "cloud", "electric vehicle", "energy", "defense", "banking", "retail", "ai"],
    explanation: "Evidence indicates sector exposure through products, customers, or operating markets.",
    validTargetTypes: ["sector"],
  },
]

const ENTITY_ALIASES: Record<string, string[]> = {
  CHINA: ["china", "chinese"],
  TAIWAN: ["taiwan", "taiwanese"],
  RARE_EARTHS: ["rare earth", "rare earths", "magnets"],
  OIL: ["oil", "crude", "fuel"],
  SEMICONDUCTORS: ["semiconductor", "semiconductors", "chip", "chips", "foundry"],
  AI_INFRASTRUCTURE: ["ai", "artificial intelligence", "gpu", "accelerated computing"],
  EV_SECTOR: ["ev", "electric vehicle", "battery"],
  ENERGY: ["energy", "oil", "natural gas", "refining"],
  DEFENSE: ["defense", "aerospace", "missile", "national security"],
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, " ")
}

function termsFor(entity: KnowledgeEntity) {
  return [entity.entityId, entity.name, entity.ticker ?? "", ...(ENTITY_ALIASES[entity.entityId] ?? [])]
    .map(normalize)
    .filter((term) => term.length >= 3)
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text)
  })
}

function humanName(entity: KnowledgeEntity) {
  return entity.ticker ? `${entity.name} (${entity.ticker})` : entity.name
}

function relationshipSummary(source: KnowledgeEntity, target: KnowledgeEntity, rule: (typeof RELATIONSHIP_RULES)[number]) {
  if (source.type === "country" && target.type === "commodity" && rule.relationshipType === "commodity_dependency") {
    return `${source.name} is directly tied to the ${target.name} shock because retrieved news evidence discusses export controls or restrictions involving that commodity.`
  }

  if (source.type === "commodity" && target.type === "country" && rule.relationshipType === "country_exposure") {
    return `${target.name} is a key geographic driver for the ${source.name} shock because retrieved evidence links that country to export controls or supply restrictions.`
  }

  if (rule.relationshipType === "commodity_dependency") {
    return `${humanName(source)} is exposed to ${target.name} because clean source evidence discusses ${target.name.toLowerCase()} as a relevant commodity, input, or price driver.`
  }

  if (rule.relationshipType === "country_exposure") {
    return `${humanName(source)} is exposed to ${target.name} because source evidence discusses operations, supply chain, demand, or policy risk tied to that geography.`
  }

  if (rule.relationshipType === "sector_exposure") {
    return `${humanName(source)} is exposed to the ${target.name} theme because source evidence discusses products, customers, infrastructure, or markets in that sector.`
  }

  return `${humanName(source)} is exposed to ${target.name} because source evidence discusses supplier, manufacturing, foundry, or supply-chain dependency.`
}

function exposureSummary(exposure: KnowledgeEntity, company: KnowledgeEntity, rule: (typeof RELATIONSHIP_RULES)[number]) {
  if (rule.relationshipType === "commodity_dependency") {
    return `${humanName(company)} is exposed to ${exposure.name} because clean source evidence discusses that commodity as an input, material, or price driver.`
  }

  if (rule.relationshipType === "country_exposure") {
    return `${humanName(company)} is exposed to ${exposure.name} because clean source evidence discusses operations, supply chain, demand, or policy risk tied to that geography.`
  }

  if (rule.relationshipType === "sector_exposure") {
    return `${humanName(company)} is exposed to ${exposure.name} because clean source evidence discusses products, customers, infrastructure, or markets in that sector.`
  }

  return `${humanName(company)} is exposed to ${exposure.name} because clean source evidence discusses supplier, manufacturing, foundry, or supply-chain dependency.`
}

function hasCleanSnippet(result: EvidenceSearchResult) {
  return cleanSnippet(result.chunk.text) !== null
}

function relationshipKey(relationship: Relationship) {
  return `${relationship.sourceEntityId}:${relationship.targetEntityId}:${relationship.relationshipType}`
}

export class DynamicKnowledgeGraphBuilder {
  build(
    event: FinancialEvent,
    entities: KnowledgeEntity[],
    evidenceResults: EvidenceSearchResult[],
  ): DynamicKnowledgeGraph {
    const relevantEntities = this.relevantEntities(event, entities, evidenceResults)
    const relationships = this.extractRelationships(event, relevantEntities, evidenceResults)

    return {
      event,
      entities: relevantEntities,
      relationships,
      evidence: evidenceResults,
    }
  }

  private relevantEntities(
    event: FinancialEvent,
    entities: KnowledgeEntity[],
    evidenceResults: EvidenceSearchResult[],
  ) {
    const evidenceText = evidenceResults.map((result) => result.chunk.text).join(" ").toLowerCase()
    const selected = entities.filter((entity) => {
      if (event.mentionedEntityIds.includes(entity.entityId)) return true
      return termsFor(entity).some((term) => term.length > 2 && evidenceText.includes(term))
    })

    return selected.length > 0 ? selected.slice(0, 30) : entities.slice(0, 12)
  }

  private extractRelationships(
    event: FinancialEvent,
    entities: KnowledgeEntity[],
    evidenceResults: EvidenceSearchResult[],
  ) {
    const drafts = new Map<string, EvidenceBackedRelationship>()

    for (const result of evidenceResults) {
      const text = normalize(result.chunk.text)
      const sourceTypes = [result.chunk.sourceType] as EvidenceSourceType[]

      if (!hasCleanSnippet(result)) continue
      if (result.chunk.sourceType === "price_returns") continue

      if (result.chunk.sourceType === "etf_holdings") {
        const etf = entities.find((entity) => entity.entityId === result.chunk.sourceEntityId)
        const holdingEntityId = result.chunk.metadata?.holdingEntityId
        const holding =
          typeof holdingEntityId === "string"
            ? entities.find((entity) => entity.entityId === holdingEntityId)
            : undefined
        if (!etf || !holding) continue

        const snippet = cleanSnippet(result.chunk.text)
        if (!snippet) continue

        const weight = typeof result.chunk.metadata?.weight === "number" ? result.chunk.metadata.weight : undefined
        const relationship: Relationship = {
          sourceEntityId: holding.entityId,
          targetEntityId: etf.entityId,
          relationshipType: "etf_holding",
          strength: weight ? Math.max(0.4, Math.min(0.95, weight * 8)) : 0.55,
          riskCategory: "portfolio_exposure",
          direction: "positive",
          evidenceSummary: `${etf.name} holds ${humanName(holding)}${weight ? ` with portfolio weight ${weight}` : ""}.`,
          evidenceSources: sourceTypes,
          evidenceUrls: result.chunk.sourceUrl ? [result.chunk.sourceUrl] : [],
          evidenceSnippets: [snippet],
          explanation: "This ETF has direct portfolio exposure to the company through parsed holdings evidence.",
        }

        const scored = scoreEvidenceRelationship(relationship, sourceTypes, result.score)
        drafts.set(relationshipKey(scored), scored)
        continue
      }

      const possibleSources =
        result.chunk.sourceType === "sec_filing" && result.chunk.sourceEntityId
          ? entities.filter((entity) => entity.entityId === result.chunk.sourceEntityId)
          : entities.filter((entity) => includesAny(text, termsFor(entity)))

      for (const sourceEntity of possibleSources) {
        for (const targetEntity of entities) {
          if (sourceEntity.entityId === targetEntity.entityId) continue
          if (sourceEntity.type === "etf" || targetEntity.type === "etf") continue
          if (!includesAny(text, termsFor(targetEntity))) continue

          for (const rule of RELATIONSHIP_RULES) {
            if (!includesAny(text, rule.keywords)) continue
            if (!rule.validTargetTypes.includes(targetEntity.type)) continue
            if (!this.isSemanticallyRelated(event, sourceEntity, targetEntity, result)) continue

            const snippet = cleanSnippet(result.chunk.text)
            if (!snippet) continue

            const orientedSource =
              result.chunk.sourceType === "sec_filing" && targetEntity.type !== "company"
                ? targetEntity
                : sourceEntity
            const orientedTarget =
              result.chunk.sourceType === "sec_filing" && targetEntity.type !== "company"
                ? sourceEntity
                : targetEntity

            const relationship: Relationship = {
              sourceEntityId: orientedSource.entityId,
              targetEntityId: orientedTarget.entityId,
              relationshipType: rule.relationshipType,
              strength: 0.55 + Math.min(result.score, 0.4),
              riskCategory: rule.riskCategory,
              direction: "positive",
              evidenceSummary:
                orientedSource.entityId === targetEntity.entityId
                  ? exposureSummary(targetEntity, sourceEntity, rule)
                  : relationshipSummary(sourceEntity, targetEntity, rule),
              evidenceSources: sourceTypes,
              evidenceUrls: result.chunk.sourceUrl ? [result.chunk.sourceUrl] : [],
              evidenceSnippets: [snippet],
              explanation: rule.explanation,
            }
            const scored = scoreEvidenceRelationship(relationship, sourceTypes, result.score)
            const key = relationshipKey(scored)
            const existing = drafts.get(key)

            if (!existing || (scored.confidence ?? 0) > (existing.confidence ?? 0)) {
              drafts.set(key, scored)
            }
          }
        }
      }
    }

    return Array.from(drafts.values())
  }

  private isSemanticallyRelated(
    event: FinancialEvent,
    sourceEntity: KnowledgeEntity,
    targetEntity: KnowledgeEntity,
    result: EvidenceSearchResult,
  ) {
    if (result.chunk.sourceType === "sec_filing") {
      return (
        result.chunk.sourceEntityId === sourceEntity.entityId &&
        this.entityMatchesQueryOrEvent(event, targetEntity)
      )
    }

    if (event.mentionedEntityIds.includes(sourceEntity.entityId)) return true
    if (event.mentionedEntityIds.includes(targetEntity.entityId)) return true

    return result.score >= 0.22
  }

  private entityMatchesQueryOrEvent(event: FinancialEvent, entity: KnowledgeEntity) {
    const query = normalize(event.query)
    if (event.mentionedEntityIds.includes(entity.entityId)) return true
    return termsFor(entity).some((term) => query.includes(term))
  }
}
