import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { LocalHashEmbeddingProvider } from "./embeddings/embedding-provider"
import { chunkText } from "./embeddings/text-chunker"
import { SimpleVectorStore } from "./embeddings/vector-store"
import { RelationshipExtractor } from "./extraction/relationship-extractor"
import { ETFHoldingsRetriever } from "./retrieval/etf-retriever"
import { PriceCorrelationBuilder } from "./retrieval/price-correlation"
import { SECTextRetriever } from "./retrieval/sec-retriever"
import { RelationshipScorer } from "./scoring/relationship-scorer"
import type {
  FinalRelationship,
  KnowledgeGraphEntity,
  NormalizedEntity,
  ScoredRelationship,
  TextChunk,
} from "./types"

const EVIDENCE_DIRS = [
  "data/evidence/sec",
  "data/evidence/etf-holdings",
  "data/evidence/prices",
]

function outputPath(relativePath: string) {
  return path.join(process.cwd(), relativePath)
}

async function ensureDirectories() {
  await Promise.all(EVIDENCE_DIRS.map((dir) => mkdir(outputPath(dir), { recursive: true })))
}

async function loadEntityUniverse() {
  const universePath = new URL("./entities-universe.json", import.meta.url)
  return JSON.parse(await readFile(universePath, "utf8")) as KnowledgeGraphEntity[]
}

function normalizeEntities(entities: KnowledgeGraphEntity[]): NormalizedEntity[] {
  return entities.map((entity) => ({
    ...entity,
    entityType: entity.type,
  }))
}

async function saveJson(relativePath: string, value: unknown) {
  await writeFile(outputPath(relativePath), `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

function relationshipKey(relationship: ScoredRelationship) {
  return `${relationship.sourceEntityId}:${relationship.targetEntityId}:${relationship.relationshipType}`
}

function dedupeRelationships(relationships: ScoredRelationship[]) {
  const deduped = new Map<string, ScoredRelationship>()

  for (const relationship of relationships) {
    const key = relationshipKey(relationship)
    const existing = deduped.get(key)

    if (
      !existing ||
      relationship.confidence > existing.confidence ||
      (relationship.confidence === existing.confidence && relationship.strength > existing.strength)
    ) {
      deduped.set(key, relationship)
    }
  }

  return Array.from(deduped.values())
}

function withRelationshipIds(relationships: ScoredRelationship[]): FinalRelationship[] {
  return relationships
    .sort((left, right) => {
      const leftKey = relationshipKey(left)
      const rightKey = relationshipKey(right)
      return leftKey.localeCompare(rightKey)
    })
    .map((relationship, index) => ({
      relationshipId: `rel-${String(index + 1).padStart(3, "0")}`,
      ...relationship,
    }))
}

function evidenceSidecar(relationships: FinalRelationship[]) {
  return relationships.map((relationship) => ({
    relationshipId: relationship.relationshipId,
    sourceEntityId: relationship.sourceEntityId,
    targetEntityId: relationship.targetEntityId,
    relationshipType: relationship.relationshipType,
    confidence: relationship.confidence,
    strength: relationship.strength,
    evidenceSummary: relationship.evidenceSummary,
    evidenceSources: relationship.evidenceSources,
    evidenceUrls: relationship.evidenceUrls,
    evidenceSnippets: relationship.evidenceSnippets,
    rawEvidenceText: relationship.rawEvidenceText,
  }))
}

async function main() {
  await ensureDirectories()

  const entities = await loadEntityUniverse()
  const normalizedEntities = normalizeEntities(entities)
  await saveJson("data/entities.json", normalizedEntities)

  const secRetriever = new SECTextRetriever()
  const embeddingProvider = new LocalHashEmbeddingProvider()
  const vectorStore = new SimpleVectorStore()
  const extractor = new RelationshipExtractor()
  const scorer = new RelationshipScorer()
  const etfRetriever = new ETFHoldingsRetriever()
  const priceCorrelationBuilder = new PriceCorrelationBuilder()

  let secLoaded = 0
  let secMissing = 0
  const secChunks: TextChunk[] = []

  for (const entity of entities.filter((candidate) => candidate.type === "company")) {
    const document = await secRetriever.load(entity)

    if (document.status === "loaded") {
      secLoaded += 1
      secChunks.push(
        ...chunkText(document.text, {
          entityId: entity.entityId,
          sourceType: document.sourceType,
          path: document.metadata.path,
          sourceUrl: document.metadata.sourceUrl,
          filingDate: document.metadata.filingDate,
          accessionNumber: document.metadata.accessionNumber,
        }),
      )
    } else {
      secMissing += 1
      console.warn(`Missing SEC evidence for ${entity.entityId}: ${document.metadata.path}`)
    }
  }

  await vectorStore.addDocuments(secChunks, embeddingProvider)

  const secRelationships: ScoredRelationship[] = []
  if (secChunks.length === 0) {
    console.warn("No SEC chunks were created. SEC-derived relationships will be empty.")
  } else {
    for (const sourceEntity of entities) {
      for (const targetEntity of entities) {
        if (sourceEntity.entityId === targetEntity.entityId) continue

        const query = `${sourceEntity.name} ${targetEntity.name} supplier customer manufacturing exposure commodity sector dependency`
        const evidenceChunks = await vectorStore.similaritySearch(query, 5, embeddingProvider)
        const drafts = extractor.extract({
          sourceEntity,
          targetEntity,
          evidenceChunks,
        })

        for (const draft of drafts) {
          const scored = scorer.score(draft)
          if (scored.confidence >= 0.55 && scored.strength >= 0.4) {
            secRelationships.push(scored)
          }
        }
      }
    }
  }

  const etfRelationships = (
    await Promise.all(
      entities
        .filter((entity) => entity.type === "etf")
        .map((entity) => etfRetriever.buildRelationships(entity)),
    )
  ).flat()

  if (etfRelationships.length === 0) {
    console.warn("No ETF holding files were loaded. ETF relationships will be empty.")
  }

  const priceRelationships = await priceCorrelationBuilder.buildRelationships()
  if (priceRelationships.length === 0) {
    console.warn("No price correlation relationships were generated.")
  }

  const deduped = dedupeRelationships([
    ...secRelationships,
    ...etfRelationships,
    ...priceRelationships,
  ])
  const finalRelationships = withRelationshipIds(deduped)

  await saveJson("data/relationships.json", finalRelationships)
  await saveJson("data/evidence/relationship-evidence.json", evidenceSidecar(finalRelationships))

  console.log("Knowledge graph build complete.")
  console.log(`Entities: ${entities.length}`)
  console.log(`SEC files loaded: ${secLoaded}`)
  console.log(`SEC files missing: ${secMissing}`)
  console.log(`Chunks created: ${secChunks.length}`)
  console.log(`Relationships generated: ${finalRelationships.length}`)
  console.log(`Entities output: ${outputPath("data/entities.json")}`)
  console.log(`Relationships output: ${outputPath("data/relationships.json")}`)
  console.log(`Evidence output: ${outputPath("data/evidence/relationship-evidence.json")}`)
}

main().catch((error) => {
  console.error("Failed to build knowledge graph.")
  console.error(error)
  process.exit(1)
})
