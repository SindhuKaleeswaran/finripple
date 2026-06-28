const FAILURE_PATTERNS = [
  /401\s+unauthorized/i,
  /403\s+forbidden/i,
  /request failed/i,
  /fetch failed/i,
  /status["']?\s*:\s*["']?unavailable/i,
  /captcha/i,
]

const READABLE_SECTION_PATTERNS = [
  /item\s+1\.\s+business/i,
  /item\s+1a\.\s+risk\s+factors/i,
  /supply\s+chain/i,
  /manufactur/i,
  /supplier/i,
  /customer/i,
  /geographic/i,
  /international/i,
]

export function isFailedEvidenceText(text: string) {
  return FAILURE_PATTERNS.some((pattern) => pattern.test(text))
}

function stripXbrl(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<ix:[^>]+>/gi, " ")
    .replace(/<\/ix:[^>]+>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, " ")
}

function removeNoisyTokens(text: string) {
  return text
    .replace(/\b[a-z]{2,}:[a-z0-9_.-]+\b/gi, " ")
    .replace(/\b\d{8,}\b/g, " ")
    .replace(/\b[0-9a-f]{16,}\b/gi, " ")
    .replace(/[{}[\]|<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function isReadableParagraph(paragraph: string) {
  const words = paragraph.match(/[A-Za-z]{3,}/g) ?? []
  const numbers = paragraph.match(/\d/g) ?? []
  const alpha = paragraph.match(/[A-Za-z]/g) ?? []
  if (words.length < 12) return false
  if (alpha.length > 0 && numbers.length / alpha.length > 0.45) return false
  if (paragraph.length > 1200 && !/[.!?]/.test(paragraph)) return false
  return !isFailedEvidenceText(paragraph)
}

export function cleanSecText(text: string) {
  const stripped = removeNoisyTokens(stripXbrl(text))
  const paragraphs = stripped
    .split(/(?<=[.!?])\s+(?=[A-Z])|\n{2,}/)
    .map((paragraph) => removeNoisyTokens(paragraph))
    .filter(isReadableParagraph)

  const preferred = paragraphs.filter((paragraph) =>
    READABLE_SECTION_PATTERNS.some((pattern) => pattern.test(paragraph)),
  )

  return (preferred.length > 0 ? preferred : paragraphs).slice(0, 180).join("\n\n")
}

export function cleanSnippet(text: string, maxLength = 420) {
  const cleaned = removeNoisyTokens(stripXbrl(text))
  if (!isReadableParagraph(cleaned)) return null

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 45 && sentence.length <= 360)

  const snippet = (sentences[0] ?? cleaned).slice(0, maxLength).trim()
  return snippet.length >= 45 ? snippet : null
}

export function chunkReadableText(
  text: string,
  maxParagraphsPerChunk = 3,
) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(isReadableParagraph)

  const chunks: string[] = []
  for (let index = 0; index < paragraphs.length; index += maxParagraphsPerChunk) {
    const chunk = paragraphs.slice(index, index + maxParagraphsPerChunk).join("\n\n")
    if (chunk.length >= 120) chunks.push(chunk)
  }

  return chunks
}
