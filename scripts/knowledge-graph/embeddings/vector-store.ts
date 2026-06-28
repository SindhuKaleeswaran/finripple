import type { TextChunk, VectorSearchResult } from "../types"
import type { EmbeddingProvider } from "./embedding-provider"

type StoredChunk = {
  chunk: TextChunk
  embedding: number[]
}

function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length)
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0

  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index]
    leftNorm += left[index] * left[index]
    rightNorm += right[index] * right[index]
  }

  if (leftNorm === 0 || rightNorm === 0) return 0
  return dot / Math.sqrt(leftNorm * rightNorm)
}

export class SimpleVectorStore {
  private readonly storedChunks: StoredChunk[] = []

  async addDocuments(chunks: TextChunk[], embeddingProvider: EmbeddingProvider) {
    for (const chunk of chunks) {
      this.storedChunks.push({
        chunk,
        embedding: await embeddingProvider.embed(chunk.text),
      })
    }
  }

  async similaritySearch(
    query: string,
    topK: number,
    embeddingProvider: EmbeddingProvider,
  ): Promise<VectorSearchResult[]> {
    if (this.storedChunks.length === 0) return []

    const queryEmbedding = await embeddingProvider.embed(query)

    return this.storedChunks
      .map((stored) => ({
        chunk: stored.chunk,
        score: cosineSimilarity(queryEmbedding, stored.embedding),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, topK)
  }
}
