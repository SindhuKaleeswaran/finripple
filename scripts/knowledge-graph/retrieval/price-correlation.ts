import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"

import type { ScoredRelationship } from "../types"

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((header) => header.trim())

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim())
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  })
}

function pearson(a: number[], b: number[]) {
  const pairs = a
    .map((value, index) => [value, b[index]] as const)
    .filter(([left, right]) => Number.isFinite(left) && Number.isFinite(right))

  if (pairs.length < 3) return 0

  const leftMean = pairs.reduce((sum, [left]) => sum + left, 0) / pairs.length
  const rightMean = pairs.reduce((sum, [, right]) => sum + right, 0) / pairs.length

  let numerator = 0
  let leftVariance = 0
  let rightVariance = 0

  for (const [left, right] of pairs) {
    const leftDelta = left - leftMean
    const rightDelta = right - rightMean
    numerator += leftDelta * rightDelta
    leftVariance += leftDelta * leftDelta
    rightVariance += rightDelta * rightDelta
  }

  const denominator = Math.sqrt(leftVariance * rightVariance)
  return denominator === 0 ? 0 : numerator / denominator
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100
}

export class PriceCorrelationBuilder {
  constructor(private readonly returnsPath = "data/evidence/prices/returns.csv") {}

  async buildRelationships(): Promise<ScoredRelationship[]> {
    const filePath = path.join(process.cwd(), this.returnsPath)

    if (!existsSync(filePath)) {
      return []
    }

    const rows = parseCsv(await readFile(filePath, "utf8"))
    if (rows.length === 0) return []

    const metadata = await this.loadMetadata()
    const columns = Object.keys(rows[0]).filter((column) => column !== "date")
    const seriesByColumn = new Map(
      columns.map((column) => [
        column,
        rows.map((row) => Number.parseFloat(row[column])),
      ]),
    )

    const relationships: ScoredRelationship[] = []
    for (let leftIndex = 0; leftIndex < columns.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < columns.length; rightIndex += 1) {
        const left = columns[leftIndex]
        const right = columns[rightIndex]
        const correlation = pearson(seriesByColumn.get(left) ?? [], seriesByColumn.get(right) ?? [])
        const absoluteCorrelation = Math.abs(correlation)

        if (absoluteCorrelation < 0.55) continue

        const strength = roundTwo(absoluteCorrelation)
        relationships.push({
          sourceEntityId: left,
          targetEntityId: right,
          relationshipType: "market_correlation",
          strength,
          confidence: 0.75,
          riskCategory: "market_comovement",
          direction: correlation >= 0 ? "positive" : "negative",
          evidenceSummary: `Historical return correlation between ${left} and ${right} was ${strength}.`,
          evidenceSources: ["price_returns"],
          evidenceUrls: [metadata[left], metadata[right]].filter(Boolean),
          evidenceSnippets: [
            `Computed from local daily returns in ${this.returnsPath}: ${left}/${right} correlation ${roundTwo(correlation)}.`,
          ],
          explanation:
            "The two assets historically moved together, suggesting shared market or sector exposure.",
          rawEvidenceText: `${left},${right},${correlation}`,
        })
      }
    }

    return relationships
  }

  private async loadMetadata(): Promise<Record<string, string>> {
    const metadataPath = path.join(path.dirname(path.join(process.cwd(), this.returnsPath)), "metadata.json")
    if (!existsSync(metadataPath)) return {}

    try {
      const parsed = JSON.parse(await readFile(metadataPath, "utf8")) as {
        tickers?: Record<string, { sourceUrl?: string }>
      }
      return Object.fromEntries(
        Object.entries(parsed.tickers ?? {}).flatMap(([ticker, metadata]) =>
          metadata.sourceUrl ? [[ticker, metadata.sourceUrl]] : [],
        ),
      )
    } catch {
      return {}
    }
  }
}
