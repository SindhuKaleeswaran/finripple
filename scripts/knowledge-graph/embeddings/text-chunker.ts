import type { TextChunk } from "../types"

const DEFAULT_CHUNK_SIZE = 800
const DEFAULT_OVERLAP = 150

export function chunkText(
  text: string,
  metadata: Record<string, unknown>,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
): TextChunk[] {
  const normalizedText = text.replace(/\s+/g, " ").trim()
  if (!normalizedText) return []

  const chunks: TextChunk[] = []
  let start = 0

  while (start < normalizedText.length) {
    const end = Math.min(start + chunkSize, normalizedText.length)
    const chunkBody = normalizedText.slice(start, end).trim()

    if (chunkBody) {
      chunks.push({
        chunkId: `${String(metadata.entityId ?? "unknown")}-${chunks.length}`,
        text: chunkBody,
        metadata,
      })
    }

    if (end === normalizedText.length) break
    start = Math.max(end - overlap, start + 1)
  }

  return chunks
}
