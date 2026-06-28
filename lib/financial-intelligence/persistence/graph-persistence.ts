import type { EvidenceBackedRelationship, FinancialEvent } from "@/lib/financial-intelligence/types"
import { loadEnvLocal } from "@/lib/env"
import { scorePersistentRelationship } from "@/lib/financial-intelligence/scoring/relationship-scorer"
import type { Relationship } from "@/lib/ripple-engine"

function relationshipKey(relationship: Relationship) {
  return `${relationship.sourceEntityId}:${relationship.targetEntityId}:${relationship.relationshipType}`
}

export class GraphPersistence {
  private persistentGraphUnavailable = false

  async mergeWithPersistentGraph(
    event: FinancialEvent,
    dynamicRelationships: EvidenceBackedRelationship[],
  ) {
    const relationshipsByKey = new Map<string, EvidenceBackedRelationship>()

    for (const relationship of dynamicRelationships) {
      relationshipsByKey.set(relationshipKey(relationship), relationship)
    }

    const sourceEntityIds = new Set([
      ...event.primaryEntityIds,
      ...event.mentionedEntityIds,
      ...dynamicRelationships.map((relationship) => relationship.sourceEntityId),
      ...dynamicRelationships.map((relationship) => relationship.targetEntityId),
    ])

    let persistentRelationshipsMerged = 0
    let dynamoDbRelationships = 0
    for (const sourceEntityId of sourceEntityIds) {
      const persistentRelationships = await this.safeGetRelationships(sourceEntityId)
      dynamoDbRelationships += persistentRelationships.length

      for (const relationship of persistentRelationships) {
        const scored = scorePersistentRelationship(relationship)
        const key = relationshipKey(scored)
        const existing = relationshipsByKey.get(key)

        if (!existing || (scored.confidence ?? 0) > (existing.confidence ?? 0)) {
          relationshipsByKey.set(key, scored)
          persistentRelationshipsMerged += 1
        }
      }
    }

    return {
      relationships: Array.from(relationshipsByKey.values()),
      dynamoDbRelationships,
      persistentRelationshipsMerged,
    }
  }

  async stageValidatedRelationship(_relationship: EvidenceBackedRelationship) {
    // Production path: write to a review queue/table before upserting into the graph.
    // The current prototype keeps graph mutation out of the hot simulation path.
  }

  private async safeGetRelationships(sourceEntityId: string) {
    if (this.persistentGraphUnavailable) {
      return []
    }

    try {
      loadEnvLocal()
      const { getRelationshipsFromSource } = await import("@/lib/relationship-repository")
      return await getRelationshipsFromSource(sourceEntityId)
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "CredentialsProviderError" || error.message.includes("EACCES"))
      ) {
        this.persistentGraphUnavailable = true
        return []
      }

      return []
    }
  }
}
