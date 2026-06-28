import type {
  DynamicKnowledgeGraph,
  HistoricalEventMatch,
  SimulationExplanation,
} from "@/lib/financial-intelligence/types"
import type { RippleNode } from "@/lib/ripple-engine"

function average(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

export class EvidenceGroundedReasoner {
  explain(
    graph: DynamicKnowledgeGraph,
    topImpacted: RippleNode[],
    historicalMatches: HistoricalEventMatch[],
  ): SimulationExplanation {
    const topRelationships = [...graph.relationships]
      .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0))
      .slice(0, 3)
    const topEntities = topImpacted
      .filter((node) => node.depth > 0)
      .slice(0, 5)
      .map((node) => `${node.entityId} (${node.impactScore.toFixed(1)})`)
      .join(", ")
    const confidence = Math.round(
      average(graph.relationships.map((relationship) => relationship.confidence ?? 0.45)) * 100,
    )

    const bulletPoints = topRelationships.map((relationship) => {
      const sourceList = relationship.evidenceSources?.join(", ") ?? "retrieved evidence"
      return `${relationship.sourceEntityId} -> ${relationship.targetEntityId}: ${relationship.explanation ?? relationship.evidenceSummary} Sources: ${sourceList}.`
    })

    if (topEntities) {
      bulletPoints.unshift(`Highest propagated impacts: ${topEntities}.`)
    }

    if (historicalMatches[0]) {
      bulletPoints.push(`Closest historical comparison: ${historicalMatches[0].title} (${historicalMatches[0].period}) because the retrieved graph overlaps ${historicalMatches[0].sourceEntityIds.join(", ")}.`)
    }

    return {
      headline:
        graph.relationships.length > 0
          ? "Evidence-backed relationships were retrieved, scored, and propagated through the financial graph."
          : "No high-confidence evidence-backed relationships were found for this scenario.",
      confidence,
      bulletPoints,
      historicalMatches,
    }
  }
}
