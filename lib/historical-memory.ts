import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  cosineSimilarity,
  LocalHashEmbeddingProvider,
} from "@/lib/financial-intelligence/embedding/local-hash-embedding"

export type HistoricalEvent = {
  id: string
  title: string
  dateRange: string
  summary: string
  affectedEntities: string[]
  affectedSectors: string[]
  shockTypes: string[]
  sourceUrls: string[]
  evidenceSnippets: string[]
}

export type HistoricalAnalogy = {
  id: string
  title: string
  dateRange: string
  similarity: number
  summary: string
  affectedEntities: string[]
  affectedSectors: string[]
  shockTypes: string[]
  sourceUrls: string[]
  evidenceSnippets: string[]
}

type IndexedHistoricalEvent = {
  event: HistoricalEvent
  embedding: number[]
}

let cachedIndex: IndexedHistoricalEvent[] | null = null

function eventSearchText(event: HistoricalEvent) {
  return [
    event.title,
    event.dateRange,
    event.summary,
    event.affectedEntities.join(" "),
    event.affectedSectors.join(" "),
    event.shockTypes.join(" "),
    event.evidenceSnippets.join(" "),
  ].join(" ")
}

export async function loadHistoricalEvents() {
  const filePath = path.join(process.cwd(), "data/evidence/historical-events.json")
  return JSON.parse(await readFile(filePath, "utf8")) as HistoricalEvent[]
}

export async function retrieveHistoricalAnalogies(query: string, topK = 3): Promise<HistoricalAnalogy[]> {
  const embeddingProvider = new LocalHashEmbeddingProvider()
  const index = await getHistoricalIndex(embeddingProvider)
  const queryEmbedding = await embeddingProvider.embed(query)

  return index
    .map(({ event, embedding }) => ({
      event,
      similarity: cosineSimilarity(queryEmbedding, embedding),
    }))
    .filter((result) => result.similarity > 0.05)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, topK)
    .map(({ event, similarity }) => ({
      id: event.id,
      title: event.title,
      dateRange: event.dateRange,
      similarity: Math.round(similarity * 100) / 100,
      summary: event.summary,
      affectedEntities: event.affectedEntities,
      affectedSectors: event.affectedSectors,
      shockTypes: event.shockTypes,
      sourceUrls: event.sourceUrls,
      evidenceSnippets: event.evidenceSnippets,
    }))
}

async function getHistoricalIndex(embeddingProvider: LocalHashEmbeddingProvider) {
  if (cachedIndex) return cachedIndex

  const events = await loadHistoricalEvents()
  cachedIndex = []
  for (const event of events) {
    cachedIndex.push({
      event,
      embedding: await embeddingProvider.embed(eventSearchText(event)),
    })
  }

  return cachedIndex
}
