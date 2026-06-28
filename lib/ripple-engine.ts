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
        const confidence = relationship.confidence ?? 0.6
        const evidenceScore = relationship.evidenceScore ?? (relationship.evidenceSnippets?.length ? 0.7 : 0.45)
        const explainabilityWeight = Math.max(0.35, Math.min(1, 0.7 * confidence + 0.3 * evidenceScore))
        const childImpact = parentNode.impactScore * relationship.strength * explainabilityWeight * decayFactor

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
        })

        const existingNode = nodesById.get(relationship.targetEntityId)
        if (existingNode && existingNode.impactScore >= childImpact) {
          continue
        }

        const childNode: RippleNode = {
          entityId: relationship.targetEntityId,
          impactScore: Number(childImpact.toFixed(2)),
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
