export type Relationship = {
  sourceEntityId: string
  targetEntityId: string
  relationshipType: string
  strength: number
  confidence?: number
  riskCategory: string
  direction: string
  evidenceSummary?: string
  evidenceSources?: string[]
  evidenceUrls?: string[]
  evidenceSnippets?: string[]
  explanation?: string
  graphSource?: "dynamic_evidence" | "persistent_graph" | "scenario_hypothesis"
  evidenceScore?: number
  sourceReliability?: number
  marketCorrelation?: number
  scenarioRelevance?: number
}

export type RippleNode = {
  entityId: string
  impactScore: number
  depth: number
  parent?: string
  reason?: string
}

export type RippleEdge = {
  source: string
  target: string
  strength: number
  confidence?: number
  relationshipType: string
  riskCategory?: string
  direction?: string
  explanation?: string
  evidenceSummary?: string
  evidenceSources?: string[]
  evidenceUrls?: string[]
  evidenceSnippets?: string[]
  graphSource?: "dynamic_evidence" | "persistent_graph" | "scenario_hypothesis"
  evidenceScore?: number
  sourceReliability?: number
  marketCorrelation?: number
  scenarioRelevance?: number
}

type SimulateRippleInput = {
  startEntityIds: string[]
  initialSeverity: number
  maxDepth: number
  decayFactor: number
  getRelationships: (sourceEntityId: string) => Promise<Relationship[]>
}

type SimulateRippleResult = {
  nodes: RippleNode[]
  edges: RippleEdge[]
  topImpacted: RippleNode[]
}

const MIN_IMPACT_SCORE = 5

const RELATIONSHIP_TYPE_MODIFIER: Record<string, number> = {
  scenario_policy_shock: 1.05,
  scenario_sector_transmission: 0.98,
  scenario_company_exposure: 0.92,
  supplier_dependency: 1,
  commodity_dependency: 0.96,
  country_exposure: 0.9,
  sector_exposure: 0.88,
  market_correlation: 0.78,
  etf_holding: 0.7,
}

function clamp(value: number, min = 0.05, max = 0.98) {
  return Math.max(min, Math.min(max, value))
}

function boundedModifier(value: number | undefined, fallback: number) {
  return clamp(value ?? fallback, 0.1, 1)
}

function evidenceStrength(relationship: Relationship) {
  const snippetStrength = Math.min(1, (relationship.evidenceSnippets?.length ?? 0) / 3)
  const evidenceScore = relationship.evidenceScore ?? (snippetStrength > 0 ? 0.68 : 0.45)
  const sourceReliability = relationship.sourceReliability ?? 0.55
  const marketCorrelation = relationship.marketCorrelation ?? 0.45

  return clamp(
    0.5 * evidenceScore + 0.25 * sourceReliability + 0.15 * marketCorrelation + 0.1 * snippetStrength,
    0.25,
    1,
  )
}

function effectiveRelationshipStrength(relationship: Relationship) {
  const confidence = boundedModifier(relationship.confidence, 0.6)
  const scenarioRelevance = boundedModifier(relationship.scenarioRelevance, 0.62)
  const typeModifier = RELATIONSHIP_TYPE_MODIFIER[relationship.relationshipType] ?? 0.86
  const evidenceModifier = evidenceStrength(relationship)

  return clamp(
    relationship.strength *
      typeModifier *
      (0.68 + 0.32 * confidence) *
      (0.72 + 0.28 * evidenceModifier) *
      (0.82 + 0.18 * scenarioRelevance),
  )
}

function debugImpactPropagation({
  relationship,
  parentImpact,
  effectiveStrength,
  finalChildImpact,
}: {
  relationship: Relationship
  parentImpact: number
  effectiveStrength: number
  finalChildImpact: number
}) {
  if (process.env.DEBUG_IMPACT !== "true" && process.env.DEBUG_RIPPLE_IMPACT !== "true") {
    return
  }

  console.log(
    [
      "[RippleImpact]",
      `source=${relationship.sourceEntityId}`,
      `target=${relationship.targetEntityId}`,
      `parentImpact=${parentImpact.toFixed(4)}`,
      `strength=${relationship.strength.toFixed(4)}`,
      `effectiveStrength=${effectiveStrength.toFixed(4)}`,
      `confidence=${(relationship.confidence ?? 0.6).toFixed(4)}`,
      `finalChildImpact=${finalChildImpact.toFixed(4)}`,
    ].join(" "),
  )
}

export async function simulateRipple({
  startEntityIds,
  initialSeverity,
  maxDepth,
  decayFactor,
  getRelationships,
}: SimulateRippleInput): Promise<SimulateRippleResult> {
  if (startEntityIds.length === 0) {
    return {
      nodes: [],
      edges: [],
      topImpacted: [],
    }
  }

  const nodesById = new Map<string, RippleNode>()
  const edgesByKey = new Map<string, RippleEdge>()
  let frontier: RippleNode[] = []

  for (const entityId of startEntityIds) {
    const node = {
      entityId,
      impactScore: initialSeverity,
      depth: 0,
      reason: 'Initial scenario impact',
    }

    nodesById.set(entityId, node)
    frontier.push(node)
  }

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
    const nextFrontier: RippleNode[] = []

    for (const parentNode of frontier) {
      const relationships = await getRelationships(parentNode.entityId)

      for (const relationship of relationships) {
        const effectiveStrength = effectiveRelationshipStrength(relationship)
        const childImpact = parentNode.impactScore * effectiveStrength * decayFactor
        debugImpactPropagation({
          relationship,
          parentImpact: parentNode.impactScore,
          effectiveStrength,
          finalChildImpact: childImpact,
        })

        if (childImpact < MIN_IMPACT_SCORE) {
          continue
        }

        const edgeKey = `${relationship.sourceEntityId}:${relationship.targetEntityId}:${relationship.relationshipType}`
        edgesByKey.set(edgeKey, {
          source: relationship.sourceEntityId,
          target: relationship.targetEntityId,
          strength: relationship.strength,
          confidence: relationship.confidence,
          relationshipType: relationship.relationshipType,
          riskCategory: relationship.riskCategory,
          direction: relationship.direction,
          explanation: relationship.explanation,
          evidenceSummary: relationship.evidenceSummary,
          evidenceSources: relationship.evidenceSources,
          evidenceUrls: relationship.evidenceUrls,
          evidenceSnippets: relationship.evidenceSnippets,
          graphSource: relationship.graphSource,
          evidenceScore: relationship.evidenceScore,
          sourceReliability: relationship.sourceReliability,
          marketCorrelation: relationship.marketCorrelation,
          scenarioRelevance: relationship.scenarioRelevance,
        })

        const existingNode = nodesById.get(relationship.targetEntityId)
        if (existingNode && existingNode.impactScore >= childImpact) {
          continue
        }

        const childNode: RippleNode = {
          entityId: relationship.targetEntityId,
          impactScore: childImpact,
          depth: depth + 1,
          parent: parentNode.entityId,
          reason:
            relationship.explanation ??
            relationship.evidenceSummary ??
            `Impact propagated through ${relationship.relationshipType}.`,
        }

        nodesById.set(relationship.targetEntityId, childNode)
        nextFrontier.push(childNode)
      }
    }

    frontier = nextFrontier
  }

  const nodes = Array.from(nodesById.values())
  const topImpacted = [...nodes].sort((a, b) => b.impactScore - a.impactScore)

  return {
    nodes,
    edges: Array.from(edgesByKey.values()),
    topImpacted,
  }
}
