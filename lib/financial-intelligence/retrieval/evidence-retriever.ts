import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

import { cosineSimilarity, type EmbeddingProvider } from "@/lib/financial-intelligence/embedding/local-hash-embedding"
import { chunkReadableText, cleanSecText, isFailedEvidenceText } from "@/lib/financial-intelligence/retrieval/evidence-cleaning"
import type { EvidenceChunk, EvidenceSearchResult, FinancialEvent, KnowledgeEntity } from "@/lib/financial-intelligence/types"

type EmbeddedChunk = {
  chunk: EvidenceChunk
  embedding: number[]
}

function chunkText(text: string, base: Omit<EvidenceChunk, "chunkId" | "text">): EvidenceChunk[] {
  if (isFailedEvidenceText(text)) return []

  return chunkReadableText(text).map((textChunk, index) => ({
    ...base,
    chunkId: `${base.path ?? base.sourceEntityId ?? base.sourceType}-${index}`,
    text: textChunk,
  }))
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  if (!existsSync(filePath)) return null
  return JSON.parse(await readFile(filePath, "utf8")) as T
}

export class SemanticEvidenceRetriever {
  private embeddedChunks: EmbeddedChunk[] | null = null

  constructor(private readonly embeddingProvider: EmbeddingProvider) {}

  async retrieve(event: FinancialEvent, entities: KnowledgeEntity[], topK = 32): Promise<EvidenceSearchResult[]> {
    const index = await this.getIndex(entities)
    const query = [
      event.query,
      event.themes.join(" "),
      entities
        .filter((entity) => event.mentionedEntityIds.includes(entity.entityId))
        .map((entity) => `${entity.name} ${entity.description}`)
        .join(" "),
    ].join(" ")
    const queryEmbedding = await this.embeddingProvider.embed(query)

    return index
      .map((entry) => ({
        chunk: entry.chunk,
        score: cosineSimilarity(queryEmbedding, entry.embedding),
      }))
      .filter((result) => result.score > 0.05 || event.mentionedEntityIds.includes(result.chunk.sourceEntityId ?? ""))
      .sort((left, right) => right.score - left.score)
      .slice(0, topK)
  }

  private async getIndex(entities: KnowledgeEntity[]) {
    if (this.embeddedChunks) return this.embeddedChunks

    const chunks = [
      ...(await this.loadSecChunks(entities)),
      ...(await this.loadNewsChunks()),
      ...(await this.loadEtfChunks()),
      ...(await this.loadPriceChunks()),
    ]

    this.embeddedChunks = []
    for (const chunk of chunks) {
      this.embeddedChunks.push({
        chunk,
        embedding: await this.embeddingProvider.embed(chunk.text),
      })
    }

    return this.embeddedChunks
  }

  private async loadSecChunks(entities: KnowledgeEntity[]) {
    const secRoot = path.join(process.cwd(), "data/evidence/sec")
    const chunks: EvidenceChunk[] = []
    for (const entity of entities.filter((candidate) => candidate.type === "company")) {
      const filePath = path.join(secRoot, `${entity.entityId}.txt`)
      if (!existsSync(filePath)) continue

      const metadata = await readJsonIfExists<{ sourceUrl?: string; filingUrl?: string; filingDate?: string }>(
        path.join(secRoot, `${entity.entityId}.metadata.json`),
      )
      const cleanedText = cleanSecText(await readFile(filePath, "utf8"))
      chunks.push(
        ...chunkText(cleanedText, {
          sourceType: "sec_filing",
          sourceEntityId: entity.entityId,
          sourceUrl: metadata?.filingUrl ?? metadata?.sourceUrl,
          path: `data/evidence/sec/${entity.entityId}.txt`,
          metadata: metadata ?? undefined,
        }),
      )
    }
    return chunks
  }

  private async loadNewsChunks() {
    const newsRoot = path.join(process.cwd(), "data/evidence/news")
    if (!existsSync(newsRoot)) return []

    const files = (await readdir(newsRoot)).filter((file) => file.endsWith(".json"))
    const chunks: EvidenceChunk[] = []
    for (const file of files) {
      const filePath = path.join(newsRoot, file)
      const parsed = JSON.parse(await readFile(filePath, "utf8")) as {
        theme?: string
        title?: string
        summary?: string
        body?: string
        sourceUrl?: string
        url?: string
        entities?: string[]
        items?: Array<{
          title?: string
          snippet?: string
          url?: string
          source?: string
          publishedAt?: string
        }>
      }
      const text = [parsed.title, parsed.summary, parsed.body].filter(Boolean).join("\n\n")
      if (text && !isFailedEvidenceText(text)) {
        chunks.push(
          ...chunkText(text, {
            sourceType: "news",
            sourceUrl: parsed.sourceUrl ?? parsed.url,
            title: parsed.title,
            path: `data/evidence/news/${file}`,
            metadata: { entities: parsed.entities ?? [] },
          }),
        )
      }

      for (const item of parsed.items ?? []) {
        const itemText = [item.title, item.snippet].filter(Boolean).join(". ")
        if (!itemText || isFailedEvidenceText(itemText)) continue

        chunks.push({
          chunkId: `data/evidence/news/${file}-${chunks.length}`,
          text: itemText,
          sourceType: "news",
          sourceUrl: item.url ?? parsed.sourceUrl,
          title: item.title,
          path: `data/evidence/news/${file}`,
          metadata: { source: item.source, publishedAt: item.publishedAt, theme: parsed.theme },
        })
      }
    }
    return chunks
  }

  private async loadEtfChunks() {
    const etfRoot = path.join(process.cwd(), "data/evidence/etf-holdings")
    if (!existsSync(etfRoot)) return []

    const files = (await readdir(etfRoot)).filter((file) => file.endsWith(".json"))
    const chunks: EvidenceChunk[] = []
    for (const file of files) {
      const etfId = file.replace(/\.json$/, "")
      const parsed = JSON.parse(await readFile(path.join(etfRoot, file), "utf8")) as {
        holdings?: Array<{
          holdingEntityId?: string
          ticker?: string
          companyName?: string
          weight?: number
          sourceUrl?: string
        }>
        metadata?: {
          status?: string
          sourceUrl?: string
          reason?: string
        }
      }

      if (parsed.metadata?.status === "unavailable" || isFailedEvidenceText(parsed.metadata?.reason ?? "")) {
        continue
      }

      const holdings = (parsed.holdings ?? []).filter(
        (holding) =>
          typeof holding.holdingEntityId === "string" &&
          typeof holding.weight === "number" &&
          Number.isFinite(holding.weight),
      )

      for (const holding of holdings) {
        chunks.push({
          chunkId: `data/evidence/etf-holdings/${file}-${holding.holdingEntityId}`,
          text: `${etfId} holds ${holding.holdingEntityId} (${holding.companyName ?? holding.ticker ?? holding.holdingEntityId}) with portfolio weight ${holding.weight}.`,
          sourceType: "etf_holdings",
          sourceEntityId: etfId,
          sourceUrl: holding.sourceUrl ?? parsed.metadata?.sourceUrl,
          path: `data/evidence/etf-holdings/${file}`,
          metadata: { holdingEntityId: holding.holdingEntityId, weight: holding.weight },
        })
      }
    }

    return [...chunks, ...(await this.loadManualEtfChunks())]
  }

  private async loadManualEtfChunks() {
    const manualRoot = path.join(process.cwd(), "data/evidence/etf-holdings/manual")
    if (!existsSync(manualRoot)) return []

    const files = (await readdir(manualRoot)).filter((file) => file.endsWith(".csv"))
    const chunks: EvidenceChunk[] = []
    for (const file of files) {
      const etfId = file.replace(/\.csv$/, "")
      const rows = parseCsv(await readFile(path.join(manualRoot, file), "utf8"))
      for (const row of rows) {
        const holdingEntityId = row.holdingEntityId || row.entityId || row.ticker
        const weight = Number.parseFloat(row.weight ?? "")
        if (!holdingEntityId || !Number.isFinite(weight)) continue

        chunks.push({
          chunkId: `data/evidence/etf-holdings/manual/${file}-${holdingEntityId}`,
          text: `${etfId} holds ${holdingEntityId} (${row.companyName ?? row.name ?? holdingEntityId}) with manually verified portfolio weight ${weight}.`,
          sourceType: "etf_holdings",
          sourceEntityId: etfId,
          sourceUrl: row.sourceUrl,
          path: `data/evidence/etf-holdings/manual/${file}`,
          metadata: { holdingEntityId, weight, manual: true },
        })
      }
    }
    return chunks
  }

  private async loadPriceChunks() {
    const pricePath = path.join(process.cwd(), "data/evidence/prices/returns.csv")
    if (!existsSync(pricePath)) return []

    const metadata = await readJsonIfExists<Record<string, unknown>>(
      path.join(process.cwd(), "data/evidence/prices/metadata.json"),
    )

    return [
      {
        chunkId: "data/evidence/prices/returns.csv-summary",
        text: `Historical daily return correlations are computed from ${metadata?.source ?? "local price return data"} stored in data/evidence/prices/returns.csv.`,
        sourceType: "price_returns" as const,
        path: "data/evidence/prices/returns.csv",
        metadata: metadata ?? undefined,
      },
    ]
  }
}

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
