import { LocalHashEmbeddingProvider } from "@/lib/financial-intelligence/embedding/local-hash-embedding"
import { EvidenceGroundedReasoner } from "@/lib/financial-intelligence/ai-reasoning/evidence-grounded-reasoner"
import { HistoricalMemory } from "@/lib/financial-intelligence/historical-memory/historical-memory"
import { loadEntityCatalog, understandFinancialEvent } from "@/lib/financial-intelligence/ingestion/entity-catalog"
import { DynamicKnowledgeGraphBuilder } from "@/lib/financial-intelligence/knowledge-graph/dynamic-graph-builder"
import { pruneLowConfidenceRelationships } from "@/lib/financial-intelligence/knowledge-graph/graph-pruner"
import { ScenarioHypothesisBuilder } from "@/lib/financial-intelligence/knowledge-graph/scenario-hypothesis-builder"
import { GraphPersistence } from "@/lib/financial-intelligence/persistence/graph-persistence"
import { SemanticEvidenceRetriever } from "@/lib/financial-intelligence/retrieval/evidence-retriever"
import type { EvidenceBackedRelationship, IntelligenceSimulationResult } from "@/lib/financial-intelligence/types"
import { retrieveHistoricalAnalogies } from "@/lib/historical-memory"
import { simulateRipple } from "@/lib/ripple-engine"

const ARCHITECTURE_MODULES = [
  "Ingestion",
  "Retrieval",
  "Embedding",
  "Knowledge Graph Builder",
  "Relationship Scoring",
  "Ripple Engine",
  "Historical Memory",
  "AI Reasoning",
  "Graph Persistence",
  "API Layer",
]

function relationshipsBySource(relationships: EvidenceBackedRelationship[]) {
  const bySource = new Map<string, EvidenceBackedRelationship[]>()
  for (const relationship of relationships) {
    const sourceRelationships = bySource.get(relationship.sourceEntityId) ?? []
    sourceRelationships.push(relationship)
    bySource.set(relationship.sourceEntityId, sourceRelationships)
  }
  return bySource
}

export class FinancialIntelligenceEngine {
  private readonly embeddingProvider = new LocalHashEmbeddingProvider()
  private readonly retriever = new SemanticEvidenceRetriever(this.embeddingProvider)
  private readonly graphBuilder = new DynamicKnowledgeGraphBuilder()
  private readonly hypothesisBuilder = new ScenarioHypothesisBuilder()
  private readonly graphPersistence = new GraphPersistence()
  private readonly historicalMemory = new HistoricalMemory()
  private readonly reasoner = new EvidenceGroundedReasoner()

  async simulate(scenario: string): Promise<IntelligenceSimulationResult> {
    const entities = await loadEntityCatalog()
    const event = understandFinancialEvent(scenario, entities)
    const evidence = await this.retriever.retrieve(event, entities)
    const dynamicGraph = this.graphBuilder.build(event, entities, evidence)
    const prunedDynamicRelationships = pruneLowConfidenceRelationships(dynamicGraph.relationships)
    const prunedRelationships = dynamicGraph.relationships.length - prunedDynamicRelationships.length
    const historicalAnalogies = await retrieveHistoricalAnalogies(scenario)
    const scenarioHypothesisEdges = this.hypothesisBuilder.build({
      event,
      entities,
      historicalAnalogies,
      existingRelationships: prunedDynamicRelationships,
    })
    const runtimeRelationships = [...prunedDynamicRelationships, ...scenarioHypothesisEdges]
    const merged = await this.graphPersistence.mergeWithPersistentGraph(event, runtimeRelationships)
    const relationshipIndex = relationshipsBySource(merged.relationships)
    const startEntityIds =
      event.primaryEntityIds.length > 0
        ? event.primaryEntityIds
        : this.inferFallbackStartEntities(merged.relationships)

    const result = await simulateRipple({
      startEntityIds,
      initialSeverity: event.severity,
      maxDepth: 4,
      decayFactor: 0.82,
      getRelationships: async (sourceEntityId) => relationshipIndex.get(sourceEntityId) ?? [],
    })

    const graphForExplanation = {
      ...dynamicGraph,
      relationships: merged.relationships,
    }
    const historicalMatches = this.historicalMemory.findMatches(event)
    const explanation = this.reasoner.explain(graphForExplanation, result.topImpacted, historicalMatches)

    return {
      scenario,
      startEntityIds,
      architecture: ARCHITECTURE_MODULES,
      evidenceSummary: {
        retrievedChunks: evidence.length,
        evidenceBackedEdges: prunedDynamicRelationships.length,
        scenarioHypothesisEdges: scenarioHypothesisEdges.length,
        persistentDynamoEdges: merged.dynamoDbRelationships,
        finalEdges: merged.relationships.length,
        dynamicRelationships: prunedDynamicRelationships.length,
        dynamoDbRelationships: merged.dynamoDbRelationships,
        persistentRelationshipsMerged: merged.persistentRelationshipsMerged,
        mergedRelationships: merged.relationships.length,
        prunedRelationships,
      },
      explanation,
      historicalAnalogies,
      result,
    }
  }

  private inferFallbackStartEntities(relationships: EvidenceBackedRelationship[]) {
    const sourceEntityIds = relationships.map((relationship) => relationship.sourceEntityId)
    return sourceEntityIds.length > 0 ? Array.from(new Set(sourceEntityIds)).slice(0, 3) : ["QQQ"]
  }
}

let engine: FinancialIntelligenceEngine | null = null

export function getFinancialIntelligenceEngine() {
  engine ??= new FinancialIntelligenceEngine()
  return engine
}
