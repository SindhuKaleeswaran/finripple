import entities from "@/data/entities.json"
import type { RippleEdge, RippleNode } from "@/lib/ripple-engine"

type EntityRecord = {
  entityId: string
  name: string
  type: string
  ticker: string | null
  description: string
}

export type PortfolioExposureHolding = {
  entityId: string
  inputSymbol: string
  matched: boolean
  exposureScore: number
  exposureLevel: "Low" | "Medium" | "High" | "Unmatched"
  reason: string
  path: string[]
}

export type PortfolioExposureResult = {
  overallRiskScore: number
  riskLevel: "Low" | "Medium" | "High"
  holdings: PortfolioExposureHolding[]
  unmatchedHoldings: PortfolioExposureHolding[]
}

type SimulationResultForExposure = {
  nodes: RippleNode[]
  edges: RippleEdge[]
}

type ParsedHolding = {
  inputSymbol: string
  lookupSymbol: string
  weight: number
}

const ENTITY_SECTOR_MAP: Record<string, string[]> = {
  NVDA: ["SEMICONDUCTORS", "AI_INFRASTRUCTURE"],
  AMD: ["SEMICONDUCTORS", "AI_INFRASTRUCTURE"],
  AAPL: ["SEMICONDUCTORS", "AI_INFRASTRUCTURE"],
  TSMC: ["SEMICONDUCTORS"],
  INTC: ["SEMICONDUCTORS"],
  QCOM: ["SEMICONDUCTORS"],
  AVGO: ["SEMICONDUCTORS", "AI_INFRASTRUCTURE"],
  MU: ["SEMICONDUCTORS"],
  TSLA: ["EV_SECTOR"],
  MSFT: ["AI_INFRASTRUCTURE", "CLOUD_COMPUTING"],
  GOOGL: ["AI_INFRASTRUCTURE", "CLOUD_COMPUTING"],
  META: ["AI_INFRASTRUCTURE"],
  AMZN: ["AI_INFRASTRUCTURE", "CLOUD_COMPUTING", "CONSUMER_RETAIL"],
  LMT: ["DEFENSE"],
  BA: ["DEFENSE"],
  JPM: ["BANKING"],
  BAC: ["BANKING"],
  XOM: ["ENERGY"],
  CVX: ["ENERGY"],
  WMT: ["CONSUMER_RETAIL"],
  COST: ["CONSUMER_RETAIL"],
  NKE: ["CONSUMER_RETAIL"],
}

const HYPOTHESIS_SECTOR_RELEVANCE: Record<string, number> = {
  EV_SECTOR: 1,
  SEMICONDUCTORS: 0.85,
  DEFENSE: 0.82,
  AI_INFRASTRUCTURE: 0.45,
  CLOUD_COMPUTING: 0.35,
  CONSUMER_RETAIL: 0.4,
  ENERGY: 0.4,
  BANKING: 0.25,
}

const ENTITY_BY_ID = new Map(
  (entities as EntityRecord[]).map((entity) => [entity.entityId.toUpperCase(), entity]),
)

const ENTITY_BY_TICKER = new Map(
  (entities as EntityRecord[])
    .filter((entity) => entity.ticker)
    .map((entity) => [entity.ticker!.toUpperCase(), entity]),
)

export function calculatePortfolioExposure(
  portfolioInput: string,
  simulationResult: SimulationResultForExposure,
): PortfolioExposureResult {
  const holdings = parsePortfolioInput(portfolioInput)
  const nodeById = new Map(simulationResult.nodes.map((node) => [node.entityId, node]))
  const edgeByTarget = new Map(simulationResult.edges.map((edge) => [edge.target, edge]))

  const analyzedHoldings = holdings.map((holding) => {
    const entity = resolveEntity(holding.lookupSymbol)
    if (!entity) {
      return unmatchedHolding(holding.inputSymbol, `No local entity matched ${holding.inputSymbol}.`)
    }

    const directNode = nodeById.get(entity.entityId)
    if (directNode) {
      const path = buildPath(directNode, nodeById)
      const incomingEdge = findIncomingEdge(directNode, simulationResult.edges) ?? edgeByTarget.get(entity.entityId)
      const relevance = pathRelevance(path, incomingEdge)
      const exposureScore = directNode.impactScore * relevance
      return {
        entityId: entity.entityId,
        inputSymbol: holding.inputSymbol,
        matched: true,
        exposureScore: roundScore(exposureScore),
        exposureLevel: exposureLevel(exposureScore),
        reason:
          directReason(entity, directNode, path, incomingEdge, relevance),
        path,
      }
    }

    const sectorMatch = bestImpactedSectorMatch(entity.entityId, nodeById, edgeByTarget)
    if (sectorMatch) {
      return {
        entityId: entity.entityId,
        inputSymbol: holding.inputSymbol,
        matched: true,
        exposureScore: roundScore(sectorMatch.score),
        exposureLevel: exposureLevel(sectorMatch.score),
        reason: `${entity.name} is not directly in the ripple graph, but it maps to impacted sector ${sectorMatch.sectorId}.`,
        path: [...sectorMatch.path, entity.entityId],
      }
    }

    return unmatchedHolding(
      holding.inputSymbol,
      `${entity.name} did not appear directly in the ripple graph and no mapped sector exposure was impacted.`,
      entity.entityId,
    )
  })

  const weightedScore = analyzedHoldings.reduce((sum, holding, index) => {
    return sum + holding.exposureScore * holdings[index].weight
  }, 0)

  const overallRiskScore = roundScore(weightedScore)
  return {
    overallRiskScore,
    riskLevel: portfolioRiskLevel(overallRiskScore),
    holdings: analyzedHoldings,
    unmatchedHoldings: analyzedHoldings.filter((holding) => !holding.matched),
  }
}

function directReason(
  entity: EntityRecord,
  directNode: RippleNode,
  path: string[],
  incomingEdge: RippleEdge | undefined,
  relevance: number,
) {
  const baseReason =
    incomingEdge?.evidenceSummary ??
    directNode.reason ??
    `${entity.name} appears directly in the simulated ripple graph.`

  if (incomingEdge?.graphSource === "scenario_hypothesis" && relevance < 0.7) {
    const sector = path.find((part) => HYPOTHESIS_SECTOR_RELEVANCE[part] !== undefined)
    return `${baseReason} Exposure is discounted because the matched path runs through ${sector ?? "a broader sector"} rather than a direct company-specific evidence edge.`
  }

  return baseReason
}

function pathRelevance(path: string[], incomingEdge?: RippleEdge) {
  if (incomingEdge?.graphSource !== "scenario_hypothesis") return 1

  const sectorRelevance = path
    .map((part) => HYPOTHESIS_SECTOR_RELEVANCE[part])
    .filter((value): value is number => typeof value === "number")
    .sort((left, right) => right - left)[0]

  return sectorRelevance ?? 0.65
}

function parsePortfolioInput(portfolioInput: string): ParsedHolding[] {
  const rawItems = portfolioInput
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  const parsed = rawItems.map((item) => {
    const [symbolPart, weightPart] = item.split(":").map((part) => part.trim())
    const parsedWeight = weightPart ? Number.parseFloat(weightPart) : Number.NaN
    return {
      inputSymbol: symbolPart.toUpperCase(),
      lookupSymbol: symbolPart.toUpperCase(),
      rawWeight: Number.isFinite(parsedWeight) ? parsedWeight : null,
    }
  })

  if (parsed.length === 0) return []

  const hasWeights = parsed.some((holding) => holding.rawWeight !== null)
  if (!hasWeights) {
    const weight = 1 / parsed.length
    return parsed.map((holding) => ({ ...holding, weight }))
  }

  const specifiedWeightSum = parsed.reduce((sum, holding) => sum + (holding.rawWeight ?? 0), 0)
  const denominator = specifiedWeightSum > 1 ? 100 : 1
  const normalizedSpecifiedSum = specifiedWeightSum / denominator
  const unweighted = parsed.filter((holding) => holding.rawWeight === null)
  const remainingWeight = Math.max(0, 1 - normalizedSpecifiedSum)
  const fallbackWeight = unweighted.length > 0 ? remainingWeight / unweighted.length : 0

  return parsed.map((holding) => ({
    inputSymbol: holding.inputSymbol,
    lookupSymbol: holding.lookupSymbol,
    weight: holding.rawWeight === null ? fallbackWeight : holding.rawWeight / denominator,
  }))
}

function resolveEntity(symbol: string) {
  return ENTITY_BY_ID.get(symbol) ?? ENTITY_BY_TICKER.get(symbol)
}

function buildPath(node: RippleNode, nodeById: Map<string, RippleNode>) {
  const path = [node.entityId]
  let current = node

  while (current.parent) {
    path.unshift(current.parent)
    const parentNode = nodeById.get(current.parent)
    if (!parentNode) break
    current = parentNode
  }

  return path
}

function bestImpactedSectorMatch(
  entityId: string,
  nodeById: Map<string, RippleNode>,
  edgeByTarget: Map<string, RippleEdge>,
) {
  const sectors = ENTITY_SECTOR_MAP[entityId] ?? []
  const matches = sectors
    .map((sectorId) => {
      const sectorNode = nodeById.get(sectorId)
      if (!sectorNode) return null

      return {
        sectorId,
        score: sectorNode.impactScore * 0.65,
        path: buildPath(sectorNode, nodeById),
        edge: edgeByTarget.get(sectorId),
      }
    })
    .filter(Boolean)

  return matches.sort((left, right) => right!.score - left!.score)[0] ?? null
}

function findIncomingEdge(node: RippleNode, edges: RippleEdge[]) {
  if (!node.parent) return undefined
  return edges.find((edge) => edge.source === node.parent && edge.target === node.entityId)
}

function unmatchedHolding(inputSymbol: string, reason: string, entityId = inputSymbol) {
  return {
    entityId,
    inputSymbol,
    matched: false,
    exposureScore: 0,
    exposureLevel: "Unmatched" as const,
    reason,
    path: [],
  }
}

function exposureLevel(score: number): PortfolioExposureHolding["exposureLevel"] {
  if (score >= 55) return "High"
  if (score >= 25) return "Medium"
  return "Low"
}

function portfolioRiskLevel(score: number): PortfolioExposureResult["riskLevel"] {
  if (score >= 55) return "High"
  if (score >= 25) return "Medium"
  return "Low"
}

function roundScore(score: number) {
  return Math.round(score * 100) / 100
}
