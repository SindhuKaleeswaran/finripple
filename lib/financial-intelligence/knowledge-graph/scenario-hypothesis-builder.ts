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

function clamp(value: number, min = 0.45, max = 0.78) {
  return Math.max(min, Math.min(max, value))
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

    for (const root of commodityRoots) {
      for (const sectorId of sectorIds) {
        this.addHypothesis(hypotheses, existingKeys, {
          sourceEntityId: root,
          targetEntityId: sectorId,
          relationshipType: "scenario_sector_transmission",
          riskCategory: "scenario_hypothesis",
          explanation: `Scenario hypothesis from ${topAnalogy.title}: a ${entityName(root, entitiesById)} shock can transmit into ${entityName(sectorId, entitiesById)} because the historical analogy affected related sectors and supply chains.`,
          evidenceSummary: `${event.query} can affect ${entityName(root, entitiesById)} supply, which historical analogies link to ${entityName(sectorId, entitiesById)} and adjacent supply chains.`,
          analogy: topAnalogy,
          strength: 0.66,
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
        this.addHypothesis(hypotheses, existingKeys, {
          sourceEntityId: sectorId,
          targetEntityId: companyId,
          relationshipType: "scenario_company_exposure",
          riskCategory: "scenario_hypothesis",
          explanation: `Scenario hypothesis from ${topAnalogy.title}: ${entityName(companyId, entitiesById)} may be affected through ${entityName(sectorId, entitiesById)} exposure.`,
          evidenceSummary: `${entityName(companyId, entitiesById)} is treated as a scenario-exposed company because the historical analogy and local entity catalog connect this shock to ${entityName(sectorId, entitiesById)}.`,
          analogy: topAnalogy,
          strength: 0.58,
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
        strength: 0.72,
      })
    }

    return Array.from(hypotheses.values())
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
    },
  ) {
    const confidence = clamp(0.52 + input.analogy.similarity * 0.34)
    const relationship: EvidenceBackedRelationship = {
      sourceEntityId: input.sourceEntityId,
      targetEntityId: input.targetEntityId,
      relationshipType: input.relationshipType,
      strength: input.strength,
      confidence,
      riskCategory: input.riskCategory,
      direction: "positive",
      evidenceSummary: input.evidenceSummary,
      evidenceSources: ["news"],
      evidenceUrls: input.analogy.sourceUrls,
      evidenceSnippets: input.analogy.evidenceSnippets.slice(0, 2),
      explanation: input.explanation,
      graphSource: "scenario_hypothesis",
      evidenceScore: 0.56,
      sourceReliability: 0.62,
      marketCorrelation: 0.45,
    }
    const key = relationshipKey(relationship)
    if (!existingKeys.has(key) && !hypotheses.has(key)) {
      hypotheses.set(key, relationship)
    }
  }
}
