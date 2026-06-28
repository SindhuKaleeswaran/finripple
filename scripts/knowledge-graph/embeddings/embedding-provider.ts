export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
}

const DIMENSION = 128

function hashToken(token: string) {
  let hash = 2166136261
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function normalize(vector: number[]) {
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (length === 0) return vector
  return vector.map((value) => value / length)
}

export class LocalHashEmbeddingProvider implements EmbeddingProvider {
  // TODO: Add optional Ollama nomic-embed-text integration for better local embeddings.
  async embed(text: string): Promise<number[]> {
    const vector = Array.from({ length: DIMENSION }, () => 0)
    const tokens = text.toLowerCase().match(/[a-z0-9_]+/g) ?? []

    for (const token of tokens) {
      const hash = hashToken(token)
      const index = hash % DIMENSION
      const sign = hash % 2 === 0 ? 1 : -1
      vector[index] += sign
    }

    return normalize(vector)
  }
}
