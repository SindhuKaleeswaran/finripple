import { readFile } from "node:fs/promises"
import path from "node:path"

import type { FinancialEvent, KnowledgeEntity } from "@/lib/financial-intelligence/types"

const EVENT_THEME_TERMS: Record<string, string[]> = {
  commodity_shock: ["oil", "crude", "gas", "lithium", "rare earth", "copper", "uranium", "shortage", "spike"],
  supply_chain: ["restricts", "ban", "export", "shortage", "disrupt", "earthquake", "tariff", "supplier"],
  semiconductor: ["semiconductor", "chip", "foundry", "fab", "gpu", "wafer", "ai accelerator"],
  geography: ["china", "taiwan", "japan", "korea", "europe", "united states"],
  portfolio: ["etf", "portfolio", "holdings", "index", "nasdaq", "s&p"],
  demand_shock: ["recession", "demand", "consumer", "travel", "retail", "banking", "credit"],
}

const ENTITY_ALIASES: Record<string, string[]> = {
  OIL: ["oil", "crude", "crude oil", "brent", "wti"],
  RARE_EARTHS: ["rare earth", "rare earths", "critical minerals", "magnets"],
  SEMICONDUCTORS: ["semiconductor", "semiconductors", "chips", "chip"],
  TAIWAN: ["taiwan", "taiwanese"],
  CHINA: ["china", "chinese"],
  EV_SECTOR: ["ev", "electric vehicle", "electric vehicles"],
  AI_INFRASTRUCTURE: ["ai", "artificial intelligence", "gpu", "accelerated computing"],
  CLOUD_COMPUTING: ["cloud", "data center", "datacenter"],
}

let cachedEntities: KnowledgeEntity[] | null = null

export async function loadEntityCatalog() {
  if (cachedEntities) return cachedEntities

  const filePath = path.join(process.cwd(), "data/entities.json")
  const entities = JSON.parse(await readFile(filePath, "utf8")) as KnowledgeEntity[]
  cachedEntities = entities.map((entity) => ({
    ...entity,
    type: entity.type ?? entity.entityType,
  }))
  return cachedEntities
}

function normalize(value: string) {
  return value.toLowerCase().replaceAll("&", "and")
}

function entityTerms(entity: KnowledgeEntity) {
  return [
    entity.entityId,
    entity.name,
    entity.ticker ?? "",
    entity.description,
    ...(ENTITY_ALIASES[entity.entityId] ?? []),
  ]
    .map(normalize)
    .filter(Boolean)
}

function detectThemes(query: string) {
  const normalizedQuery = normalize(query)
  return Object.entries(EVENT_THEME_TERMS)
    .filter(([, terms]) => terms.some((term) => normalizedQuery.includes(term)))
    .map(([theme]) => theme)
}

function inferSeverity(query: string, themes: string[]) {
  const normalizedQuery = normalize(query)
  const highSeverityTerms = ["ban", "restrict", "halts", "war", "earthquake", "crisis", "surge", "spike", "collapse"]
  const modifier = highSeverityTerms.filter((term) => normalizedQuery.includes(term)).length * 7
  return Math.min(100, Math.max(55, 68 + themes.length * 4 + modifier))
}

export function understandFinancialEvent(query: string, entities: KnowledgeEntity[]): FinancialEvent {
  const normalizedQuery = normalize(query)
  const scoredEntities = entities
    .map((entity) => {
      const terms = entityTerms(entity)
      const exactMatches = terms.filter((term) => term.length > 1 && normalizedQuery.includes(term)).length
      return {
        entity,
        score: exactMatches * 4,
      }
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score)

  const mentionedEntityIds = scoredEntities.map((match) => match.entity.entityId)
  const primaryEntityIds = mentionedEntityIds.slice(0, 5)
  const themes = detectThemes(query)

  return {
    query,
    eventId: `event-${Date.now()}`,
    severity: inferSeverity(query, themes),
    primaryEntityIds,
    mentionedEntityIds,
    themes,
  }
}
