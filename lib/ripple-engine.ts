export type Relationship = {
  sourceEntityId: string
  targetEntityId: string
  relationshipType: string
  strength: number
  riskCategory: string
  direction: string
  explanation?: string
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
  relationshipType: string
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
        const childImpact = parentNode.impactScore * relationship.strength * decayFactor

        if (childImpact < MIN_IMPACT_SCORE) {
          continue
        }

        const edgeKey = `${relationship.sourceEntityId}:${relationship.targetEntityId}:${relationship.relationshipType}`
        edgesByKey.set(edgeKey, {
          source: relationship.sourceEntityId,
          target: relationship.targetEntityId,
          strength: relationship.strength,
          relationshipType: relationship.relationshipType,
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
          reason: relationship.explanation,
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
