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
  return length === 0 ? vector : vector.map((value) => value / length)
}

export class LocalHashEmbeddingProvider implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    const vector = Array.from({ length: DIMENSION }, () => 0)
    const tokens = text.toLowerCase().match(/[a-z0-9_]+/g) ?? []

    for (const token of tokens) {
      const hash = hashToken(token)
      vector[hash % DIMENSION] += hash % 2 === 0 ? 1 : -1
    }

    return normalize(vector)
  }
}

export function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length)
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0

  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index]
    leftNorm += left[index] * left[index]
    rightNorm += right[index] * right[index]
  }

  return leftNorm === 0 || rightNorm === 0 ? 0 : dot / Math.sqrt(leftNorm * rightNorm)
}
