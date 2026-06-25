import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"

import type { KnowledgeGraphEntity, ScoredRelationship } from "../types"

type Holding = {
  holdingEntityId: string
  ticker?: string
  companyName?: string
  weight: number
  sourceUrl?: string
  asOfDate?: string
}

function normalizeHoldingWeight(weight: number) {
  if (weight >= 0.1) return 0.95
  if (weight >= 0.075) return 0.85
  if (weight >= 0.05) return 0.75
  if (weight >= 0.025) return 0.6
  return 0.4
}

export class ETFHoldingsRetriever {
  constructor(private readonly holdingsRoot = "data/evidence/etf-holdings") {}

  async loadHoldings(etfEntityId: string): Promise<Holding[]> {
    const filePath = path.join(process.cwd(), this.holdingsRoot, `${etfEntityId}.json`)

    if (!existsSync(filePath)) {
      return []
    }

    const parsed = JSON.parse(await readFile(filePath, "utf8")) as Holding[] | { holdings?: Holding[] }
    const holdings = Array.isArray(parsed) ? parsed : parsed.holdings ?? []

    return holdings.filter(
      (holding) =>
        typeof holding.holdingEntityId === "string" &&
        typeof holding.weight === "number" &&
        Number.isFinite(holding.weight),
    )
  }

  async buildRelationships(etf: KnowledgeGraphEntity): Promise<ScoredRelationship[]> {
    const holdings = await this.loadHoldings(etf.entityId)

    return holdings.map((holding) => ({
      sourceEntityId: holding.holdingEntityId,
      targetEntityId: etf.entityId,
      relationshipType: "etf_holding",
      strength: normalizeHoldingWeight(holding.weight),
      confidence: 1,
      riskCategory: "portfolio_exposure",
      direction: "positive",
      evidenceSummary: `${etf.entityId} holds ${holding.holdingEntityId} with weight ${holding.weight}.`,
      evidenceSources: ["etf_holdings"],
      evidenceUrls: holding.sourceUrl ? [holding.sourceUrl] : [],
      evidenceSnippets: [
        `${etf.entityId} holding ${holding.ticker ?? holding.holdingEntityId}: ${holding.companyName ?? holding.holdingEntityId}, weight ${holding.weight}.`,
      ],
      explanation:
        "This ETF has direct exposure to the company through portfolio holdings.",
      rawEvidenceText: JSON.stringify(holding),
    }))
  }
}
