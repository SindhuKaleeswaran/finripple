import type { HistoricalAnalogy } from "@/lib/historical-memory"
import type {
  EvidenceBackedRelationship,
  FinancialEvent,
  KnowledgeEntity,
} from "@/lib/financial-intelligence/types"

const RARE_EARTH_DOWNSTREAM = ["EV_SECTOR", "DEFENSE", "SEMICONDUCTORS", "AI_INFRASTRUCTURE"]
const SECTOR_COMPANY_EXPOSURE: Record<string, string[]> = {
  EV_SECTOR: ["TSLA"],
  SEMICONDUCTORS: ["NVDA", "AMD", "AAPL", "TSMC", "INTC", "QCOM", "AVGO", "MU"],
  AI_INFRASTRUCTURE: ["NVDA", "AMD", "MSFT", "GOOGL", "META", "AMZN"],
  DEFENSE: ["LMT", "BA"],
  ENERGY: ["XOM", "CVX"],
  BANKING: ["JPM", "BAC"],
  CONSUMER_RETAIL: ["WMT", "COST", "AMZN", "NKE"],
}

const RARE_EARTH_SECTOR_RELEVANCE: Record<string, number> = {
  EV_SECTOR: 0.96,
  DEFENSE: 0.91,
  SEMICONDUCTORS: 0.84,
  AI_INFRASTRUCTURE: 0.58,
}

const SECTOR_COMPANY_RELEVANCE: Record<string, Record<string, number>> = {
  EV_SECTOR: {
    TSLA: 0.94,
  },
  DEFENSE: {
    LMT: 0.9,
    BA: 0.74,
  },
  SEMICONDUCTORS: {
    TSMC: 0.96,
    NVDA: 0.9,
    AMD: 0.84,
    INTC: 0.8,
    AVGO: 0.78,
    MU: 0.76,
    QCOM: 0.72,
    AAPL: 0.66,
  },
  AI_INFRASTRUCTURE: {
    NVDA: 0.94,
    AMD: 0.82,
    MSFT: 0.72,
    GOOGL: 0.68,
    META: 0.64,
    AMZN: 0.62,
  },
  ENERGY: {
    XOM: 0.86,
    CVX: 0.82,
  },
  BANKING: {
    JPM: 0.82,
    BAC: 0.76,
  },
  CONSUMER_RETAIL: {
    AMZN: 0.82,
    WMT: 0.78,
    COST: 0.72,
    NKE: 0.58,
  },
}

function clamp(value: number, min = 0.45, max = 0.88) {
  return Math.max(min, Math.min(max, value))
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ")
}

function entityText(entityId: string, entitiesById: Map<string, KnowledgeEntity>) {
  const entity = entitiesById.get(entityId)
  return normalize([entity?.entityId, entity?.name, entity?.ticker, entity?.description].filter(Boolean).join(" "))
}

function termOverlapScore(haystack: string, needle: string) {
  const terms = Array.from(new Set(needle.split(/\s+/).filter((term) => term.length >= 3)))
  if (terms.length === 0) return 0

  const matches = terms.filter((term) => haystack.includes(term)).length
  return matches / terms.length
}

function relationshipKey(relationship: EvidenceBackedRelationship) {
  return `${relationship.sourceEntityId}:${relationship.targetEntityId}:${relationship.relationshipType}`
}

function entityName(entityId: string, entitiesById: Map<string, KnowledgeEntity>) {
  return entitiesById.get(entityId)?.name ?? entityId
}

export class ScenarioHypothesisBuilder {
  build({
    event,
    entities,
    historicalAnalogies,
    existingRelationships,
  }: {
    event: FinancialEvent
    entities: KnowledgeEntity[]
    historicalAnalogies: HistoricalAnalogy[]
    existingRelationships: EvidenceBackedRelationship[]
  }) {
    const entitiesById = new Map(entities.map((entity) => [entity.entityId, entity]))
    const topAnalogy = historicalAnalogies[0]
    if (!topAnalogy) return []

    const hypotheses = new Map<string, EvidenceBackedRelationship>()
    const existingKeys = new Set(existingRelationships.map(relationshipKey))
    const affectedEntityIds = new Set(
      topAnalogy.affectedEntities.filter((entityId) => entitiesById.has(entityId)),
    )

    for (const entityId of event.mentionedEntityIds) {
      affectedEntityIds.add(entityId)
    }

    if (event.mentionedEntityIds.includes("RARE_EARTHS")) {
      for (const entityId of RARE_EARTH_DOWNSTREAM) {
        if (entitiesById.has(entityId)) affectedEntityIds.add(entityId)
      }
    }

    const sourceRoots = event.mentionedEntityIds.filter((entityId) => entitiesById.has(entityId))
    const commodityRoots = sourceRoots.filter((entityId) => entitiesById.get(entityId)?.type === "commodity")
    const sectorIds = Array.from(affectedEntityIds).filter((entityId) => entitiesById.get(entityId)?.type === "sector")
    const companyIds = Array.from(affectedEntityIds).filter((entityId) => entitiesById.get(entityId)?.type === "company")
    const analogyText = normalize(
      [
        topAnalogy.title,
        topAnalogy.summary,
        topAnalogy.affectedEntities.join(" "),
        topAnalogy.affectedSectors.join(" "),
        topAnalogy.shockTypes.join(" "),
        topAnalogy.evidenceSnippets.join(" "),
      ].join(" "),
    )
    const queryText = normalize(`${event.query} ${event.themes.join(" ")}`)

    for (const root of commodityRoots) {
      for (const sectorId of sectorIds) {
        const relevance = this.sectorRelevance(root, sectorId, queryText, analogyText, entitiesById, topAnalogy)
        this.addHypothesis(hypotheses, existingKeys, {
          sourceEntityId: root,
          targetEntityId: sectorId,
          relationshipType: "scenario_sector_transmission",
          riskCategory: "scenario_hypothesis",
          explanation: `Scenario hypothesis from ${topAnalogy.title}: a ${entityName(root, entitiesById)} shock can transmit into ${entityName(sectorId, entitiesById)} because the historical analogy affected related sectors and supply chains.`,
          evidenceSummary: `${event.query} can affect ${entityName(root, entitiesById)} supply, which historical analogies link to ${entityName(sectorId, entitiesById)} and adjacent supply chains.`,
          analogy: topAnalogy,
          strength: clamp(0.52 + topAnalogy.similarity * 0.13 + relevance * 0.2, 0.48, 0.83),
          scenarioRelevance: relevance,
        })
      }
    }

    for (const sectorId of sectorIds) {
      const exposedCompanies = new Set([
        ...(SECTOR_COMPANY_EXPOSURE[sectorId] ?? []),
        ...companyIds,
      ])

      for (const companyId of exposedCompanies) {
        if (!entitiesById.has(companyId)) continue
        const relevance = this.companyRelevance(sectorId, companyId, queryText, analogyText, entitiesById, topAnalogy)
        this.addHypothesis(hypotheses, existingKeys, {
          sourceEntityId: sectorId,
          targetEntityId: companyId,
          relationshipType: "scenario_company_exposure",
          riskCategory: "scenario_hypothesis",
          explanation: `Scenario hypothesis from ${topAnalogy.title}: ${entityName(companyId, entitiesById)} may be affected through ${entityName(sectorId, entitiesById)} exposure.`,
          evidenceSummary: `${entityName(companyId, entitiesById)} is treated as a scenario-exposed company because the historical analogy and local entity catalog connect this shock to ${entityName(sectorId, entitiesById)}.`,
          analogy: topAnalogy,
          strength: clamp(0.43 + topAnalogy.similarity * 0.1 + relevance * 0.25, 0.42, 0.78),
          scenarioRelevance: relevance,
        })
      }
    }

    if (event.mentionedEntityIds.includes("CHINA") && event.mentionedEntityIds.includes("RARE_EARTHS")) {
      this.addHypothesis(hypotheses, existingKeys, {
        sourceEntityId: "CHINA",
        targetEntityId: "RARE_EARTHS",
        relationshipType: "scenario_policy_shock",
        riskCategory: "scenario_hypothesis",
        explanation: `Scenario hypothesis from ${topAnalogy.title}: China policy actions can create rare-earth supply stress.`,
        evidenceSummary:
          "China export restrictions can affect rare-earth supply, which historically impacted electronics, EVs, defense systems, and clean-energy supply chains.",
        analogy: topAnalogy,
        strength: clamp(0.68 + topAnalogy.similarity * 0.08, 0.68, 0.82),
        scenarioRelevance: 0.98,
      })
    }

    return Array.from(hypotheses.values())
  }

  private sectorRelevance(
    rootId: string,
    sectorId: string,
    queryText: string,
    analogyText: string,
    entitiesById: Map<string, KnowledgeEntity>,
    analogy: HistoricalAnalogy,
  ) {
    const entityTerms = entityText(sectorId, entitiesById)
    const directRareEarthRelevance =
      rootId === "RARE_EARTHS" ? (RARE_EARTH_SECTOR_RELEVANCE[sectorId] ?? 0.52) : 0.5
    const analogyEntityMatch = analogy.affectedEntities.includes(sectorId) ? 1 : 0
    const queryOverlap = termOverlapScore(queryText, entityTerms)
    const analogyOverlap = termOverlapScore(analogyText, entityTerms)

    return clamp(
      0.38 * directRareEarthRelevance +
        0.24 * analogyEntityMatch +
        0.2 * analogyOverlap +
        0.12 * queryOverlap +
        0.06 * analogy.similarity,
      0.35,
      0.98,
    )
  }

  private companyRelevance(
    sectorId: string,
    companyId: string,
    queryText: string,
    analogyText: string,
    entitiesById: Map<string, KnowledgeEntity>,
    analogy: HistoricalAnalogy,
  ) {
    const entityTerms = entityText(companyId, entitiesById)
    const catalogRelevance = SECTOR_COMPANY_RELEVANCE[sectorId]?.[companyId] ?? 0.5
    const analogyEntityMatch = analogy.affectedEntities.includes(companyId) ? 1 : 0
    const queryOverlap = termOverlapScore(queryText, entityTerms)
    const analogyOverlap = termOverlapScore(analogyText, entityTerms)

    return clamp(
      0.46 * catalogRelevance +
        0.22 * analogyEntityMatch +
        0.16 * analogyOverlap +
        0.1 * queryOverlap +
        0.06 * analogy.similarity,
      0.32,
      0.98,
    )
  }

  private addHypothesis(
    hypotheses: Map<string, EvidenceBackedRelationship>,
    existingKeys: Set<string>,
    input: {
      sourceEntityId: string
      targetEntityId: string
      relationshipType: string
      riskCategory: string
      explanation: string
      evidenceSummary: string
      analogy: HistoricalAnalogy
      strength: number
      scenarioRelevance: number
    },
  ) {
    const confidence = clamp(0.48 + input.analogy.similarity * 0.24 + input.scenarioRelevance * 0.16, 0.46, 0.86)
    const evidenceScore = clamp(
      0.48 + input.analogy.similarity * 0.16 + input.scenarioRelevance * 0.18,
      0.45,
      0.78,
    )
    const relationship: EvidenceBackedRelationship = {
      sourceEntityId: input.sourceEntityId,
      targetEntityId: input.targetEntityId,
      relationshipType: input.relationshipType,
      strength: roundTwo(input.strength),
      confidence: roundTwo(confidence),
      riskCategory: input.riskCategory,
      direction: "positive",
      evidenceSummary: input.evidenceSummary,
      evidenceSources: ["news"],
      evidenceUrls: input.analogy.sourceUrls,
      evidenceSnippets: input.analogy.evidenceSnippets.slice(0, 2),
      explanation: input.explanation,
      graphSource: "scenario_hypothesis",
      evidenceScore: roundTwo(evidenceScore),
      sourceReliability: roundTwo(clamp(0.56 + input.analogy.similarity * 0.12, 0.52, 0.72)),
      marketCorrelation: 0.45,
      scenarioRelevance: roundTwo(input.scenarioRelevance),
    }
    const key = relationshipKey(relationship)
    if (!existingKeys.has(key) && !hypotheses.has(key)) {
      hypotheses.set(key, relationship)
    }
  }
}
