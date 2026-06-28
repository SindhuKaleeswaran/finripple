import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import type { KnowledgeGraphEntity } from "./types"

type SecSubmission = {
  filings?: {
    recent?: {
      form?: string[]
      filingDate?: string[]
      accessionNumber?: string[]
      primaryDocument?: string[]
    }
  }
}

type CollectedHolding = {
  holdingEntityId: string
  ticker: string
  companyName: string
  weight: number
  sourceUrl: string
  asOfDate: string
}

const COMPANY_PRICE_TICKERS = [
  "NVDA",
  "TSM",
  "AAPL",
  "TSLA",
  "MSFT",
  "AMZN",
  "AMD",
  "INTC",
  "GOOGL",
  "META",
  "AVGO",
  "QCOM",
  "ASML",
  "MU",
  "ORCL",
  "CRM",
  "JPM",
  "BAC",
  "XOM",
  "CVX",
  "BA",
  "LMT",
  "COST",
  "WMT",
  "NKE",
]

const ETF_IDS = ["QQQ", "SPY", "SOXX", "XLK", "XLE", "XLF", "XLY"]

const NEWS_THEMES = [
  {
    id: "rare-earth-export-restrictions",
    query: "rare earth export restrictions",
  },
  {
    id: "taiwan-earthquake-semiconductor-disruption",
    query: "Taiwan earthquake semiconductor disruption",
  },
  {
    id: "oil-price-spike-airlines",
    query: "oil price spike airlines",
  },
  {
    id: "china-chip-export-controls",
    query: "China chip export controls",
  },
  {
    id: "lithium-battery-supply-chain",
    query: "lithium battery supply chain",
  },
]

const force = process.argv.includes("--force")

function repoPath(relativePath: string) {
  return path.join(process.cwd(), relativePath)
}

async function ensureDirs() {
  await Promise.all(
    [
      "data/evidence/sec",
      "data/evidence/etf-holdings",
      "data/evidence/prices",
      "data/evidence/news",
    ].map((dir) => mkdir(repoPath(dir), { recursive: true })),
  )
}

function loadEnvLocal() {
  const envPath = repoPath(".env.local")
  if (!existsSync(envPath)) return

  const lines = require("node:fs").readFileSync(envPath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex === -1) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    if (key && process.env[key] === undefined) {
      process.env[key] = rawValue.replace(/^["']|["']$/g, "")
    }
  }
}

async function loadEntities() {
  const universePath = new URL("./entities-universe.json", import.meta.url)
  return JSON.parse(await readFile(universePath, "utf8")) as KnowledgeGraphEntity[]
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }
  return (await response.json()) as T
}

async function fetchText(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`)
  }
  return response.text()
}

function padCik(cik: string) {
  return cik.replace(/\D/g, "").padStart(10, "0")
}

function stripHtmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function collectSecEvidence(entities: KnowledgeGraphEntity[]) {
  const userAgent = process.env.SEC_USER_AGENT
  if (!userAgent) {
    throw new Error(
      'SEC_USER_AGENT is required. SEC asks automated clients to provide a descriptive User-Agent. Add SEC_USER_AGENT="FinRipple research project your.email@example.com" to .env.local.',
    )
  }

  let downloaded = 0
  let cached = 0
  let skipped = 0

  for (const entity of entities.filter((candidate) => candidate.type === "company" && candidate.cik)) {
    const outputPath = repoPath(`data/evidence/sec/${entity.entityId}.txt`)
    const metadataPath = repoPath(`data/evidence/sec/${entity.entityId}.metadata.json`)

    if (!force && existsSync(outputPath) && existsSync(metadataPath)) {
      cached += 1
      continue
    }

    try {
      const paddedCik = padCik(entity.cik ?? "")
      const submissionsUrl = `https://data.sec.gov/submissions/CIK${paddedCik}.json`
      const submission = await fetchJson<SecSubmission>(submissionsUrl, {
        headers: { "User-Agent": userAgent, Accept: "application/json" },
      })
      await delay(250)

      const recent = submission.filings?.recent
      const forms = recent?.form ?? []
      const tenKIndex = forms.findIndex((form) => form === "10-K")
      if (tenKIndex === -1 || !recent) {
        console.warn(`No recent 10-K found for ${entity.entityId}.`)
        skipped += 1
        continue
      }

      const accessionNumber = recent.accessionNumber?.[tenKIndex]
      const primaryDocument = recent.primaryDocument?.[tenKIndex]
      const filingDate = recent.filingDate?.[tenKIndex]
      if (!accessionNumber || !primaryDocument || !filingDate) {
        console.warn(`Incomplete 10-K metadata for ${entity.entityId}.`)
        skipped += 1
        continue
      }

      const cikNoLeadingZeros = String(Number.parseInt(paddedCik, 10))
      const accessionNoNoDashes = accessionNumber.replaceAll("-", "")
      const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cikNoLeadingZeros}/${accessionNoNoDashes}/${primaryDocument}`
      const filingHtml = await fetchText(filingUrl, {
        headers: { "User-Agent": userAgent, Accept: "text/html,application/xhtml+xml,text/plain" },
      })
      await delay(250)

      await writeFile(outputPath, `${stripHtmlToText(filingHtml)}\n`, "utf8")
      await writeFile(
        metadataPath,
        `${JSON.stringify(
          {
            entityId: entity.entityId,
            ticker: entity.ticker,
            cik: entity.cik,
            form: "10-K",
            filingDate,
            accessionNumber,
            filingUrl,
            downloadedAt: new Date().toISOString(),
          },
          null,
          2,
        )}\n`,
        "utf8",
      )
      downloaded += 1
      console.log(`Downloaded SEC 10-K for ${entity.entityId}.`)
    } catch (error) {
      skipped += 1
      console.warn(`SEC collection failed for ${entity.entityId}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return { downloaded, cached, skipped }
}

function tickerToEntityIdMap(entities: KnowledgeGraphEntity[]) {
  return new Map(
    entities
      .filter((entity) => entity.ticker)
      .map((entity) => [entity.ticker as string, entity.entityId]),
  )
}

async function collectEtfHoldings(entities: KnowledgeGraphEntity[]) {
  const tickerMap = tickerToEntityIdMap(entities)
  let parsed = 0
  let unavailable = 0

  for (const etfId of ETF_IDS) {
    const outputPath = repoPath(`data/evidence/etf-holdings/${etfId}.json`)
    if (!force && existsSync(outputPath)) {
      parsed += 1
      continue
    }

    const sourceUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(etfId)}?modules=topHoldings`
    try {
      const payload = await fetchJson<Record<string, unknown>>(sourceUrl)
      const quoteSummary = payload.quoteSummary as { result?: unknown[] } | undefined
      const result = quoteSummary?.result?.[0] as { topHoldings?: { holdings?: unknown[] } } | undefined
      const holdings = result?.topHoldings?.holdings ?? []
      const parsedHoldings: CollectedHolding[] = []

      for (const rawHolding of holdings) {
        const holding = rawHolding as {
          symbol?: string
          holdingName?: string
          holdingPercent?: { raw?: number }
        }
        if (!holding.symbol || typeof holding.holdingPercent?.raw !== "number") continue
        const holdingEntityId = tickerMap.get(holding.symbol)
        if (!holdingEntityId) continue

        parsedHoldings.push({
          holdingEntityId,
          ticker: holding.symbol,
          companyName: holding.holdingName ?? holding.symbol,
          weight: holding.holdingPercent.raw,
          sourceUrl,
          asOfDate: new Date().toISOString().slice(0, 10),
        })
      }

      if (parsedHoldings.length === 0) {
        unavailable += 1
        await writeUnavailableHoldings(outputPath, etfId, sourceUrl, "Yahoo Finance response did not contain parseable mapped holdings.")
        continue
      }

      await writeFile(outputPath, `${JSON.stringify({ holdings: parsedHoldings, metadata: { sourceUrl, collectedAt: new Date().toISOString() } }, null, 2)}\n`, "utf8")
      parsed += 1
      console.log(`Collected ${parsedHoldings.length} holdings for ${etfId}.`)
    } catch (error) {
      unavailable += 1
      await writeUnavailableHoldings(
        outputPath,
        etfId,
        sourceUrl,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  return { parsed, unavailable }
}

async function writeUnavailableHoldings(outputPath: string, etfId: string, sourceUrl: string, reason: string) {
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        holdings: [],
        metadata: {
          etfId,
          sourceUrl,
          status: "unavailable",
          reason,
          collectedAt: new Date().toISOString(),
          todo: "If issuer/Yahoo parsing is unreliable, import a verified issuer CSV manually into this file.",
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  )
}

async function collectPrices() {
  const end = Math.floor(Date.now() / 1000)
  const start = end - 730 * 24 * 60 * 60
  const pricesByTicker = new Map<string, Map<string, number>>()
  const metadata: Record<string, unknown> = {
    source: "Yahoo Finance chart API",
    collectedAt: new Date().toISOString(),
    tickers: {},
  }

  for (const ticker of COMPANY_PRICE_TICKERS) {
    const sourceUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${start}&period2=${end}&interval=1d&events=history&includeAdjustedClose=true`
    try {
      const payload = await fetchJson<Record<string, unknown>>(sourceUrl)
      const chart = payload.chart as { result?: unknown[] } | undefined
      const result = chart?.result?.[0] as {
        timestamp?: number[]
        indicators?: {
          quote?: { close?: Array<number | null> }[]
          adjclose?: { adjclose?: Array<number | null> }[]
        }
      } | undefined
      const timestamps = result?.timestamp ?? []
      const adjustedClose = result?.indicators?.adjclose?.[0]?.adjclose ?? result?.indicators?.quote?.[0]?.close ?? []
      const tickerPrices = new Map<string, number>()

      timestamps.forEach((timestamp, index) => {
        const price = adjustedClose[index]
        if (typeof price === "number" && Number.isFinite(price)) {
          tickerPrices.set(new Date(timestamp * 1000).toISOString().slice(0, 10), price)
        }
      })

      if (tickerPrices.size === 0) {
        console.warn(`No parseable prices for ${ticker}.`)
        continue
      }

      pricesByTicker.set(ticker, tickerPrices)
      ;(metadata.tickers as Record<string, unknown>)[ticker] = {
        sourceUrl,
        observations: tickerPrices.size,
      }
      console.log(`Collected ${tickerPrices.size} prices for ${ticker}.`)
    } catch (error) {
      console.warn(`Price collection failed for ${ticker}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  await writePriceCsvs(pricesByTicker, metadata)
  return { tickers: pricesByTicker.size }
}

async function writePriceCsvs(
  pricesByTicker: Map<string, Map<string, number>>,
  metadata: Record<string, unknown>,
) {
  const tickers = Array.from(pricesByTicker.keys()).sort()
  const dates = Array.from(
    new Set(Array.from(pricesByTicker.values()).flatMap((series) => Array.from(series.keys()))),
  ).sort()
  const pricesRows = [["date", ...tickers].join(",")]
  const returnsRows = [["date", ...tickers].join(",")]
  const previousPrices = new Map<string, number>()

  for (const date of dates) {
    pricesRows.push(
      [date, ...tickers.map((ticker) => pricesByTicker.get(ticker)?.get(date)?.toString() ?? "")].join(","),
    )

    const returnValues = tickers.map((ticker) => {
      const price = pricesByTicker.get(ticker)?.get(date)
      const previousPrice = previousPrices.get(ticker)
      if (typeof price === "number") previousPrices.set(ticker, price)
      if (typeof price !== "number" || typeof previousPrice !== "number" || previousPrice === 0) return ""
      return ((price - previousPrice) / previousPrice).toString()
    })
    returnsRows.push([date, ...returnValues].join(","))
  }

  await writeFile(repoPath("data/evidence/prices/prices.csv"), `${pricesRows.join("\n")}\n`, "utf8")
  await writeFile(repoPath("data/evidence/prices/returns.csv"), `${returnsRows.join("\n")}\n`, "utf8")
  await writeFile(repoPath("data/evidence/prices/metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8")
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function rssTag(item: string, tag: string) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))
  return match ? stripHtmlToText(decodeXml(match[1])) : ""
}

async function collectNews() {
  let themes = 0
  for (const theme of NEWS_THEMES) {
    const sourceUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(theme.query)}&hl=en-US&gl=US&ceid=US:en`
    try {
      const rss = await fetchText(sourceUrl, {
        headers: { "User-Agent": "FinRipple research project RSS collector" },
      })
      const items = Array.from(rss.matchAll(/<item>([\s\S]*?)<\/item>/gi))
        .slice(0, 10)
        .map((match) => {
          const item = match[1]
          return {
            title: rssTag(item, "title"),
            url: rssTag(item, "link"),
            source: rssTag(item, "source") || "Google News RSS",
            publishedAt: rssTag(item, "pubDate"),
            snippet: rssTag(item, "description"),
          }
        })
        .filter((item) => item.title && item.url)

      await writeFile(
        repoPath(`data/evidence/news/${theme.id}.json`),
        `${JSON.stringify({ theme: theme.query, sourceUrl, items, collectedAt: new Date().toISOString() }, null, 2)}\n`,
        "utf8",
      )
      themes += 1
    } catch (error) {
      console.warn(`News collection failed for ${theme.id}: ${error instanceof Error ? error.message : String(error)}`)
      await writeFile(
        repoPath(`data/evidence/news/${theme.id}.json`),
        `${JSON.stringify({ theme: theme.query, sourceUrl, items: [], error: error instanceof Error ? error.message : String(error), collectedAt: new Date().toISOString() }, null, 2)}\n`,
        "utf8",
      )
    }
  }
  return { themes }
}

async function main() {
  loadEnvLocal()
  await ensureDirs()
  const entities = await loadEntities()

  const sec = await collectSecEvidence(entities)
  const etf = await collectEtfHoldings(entities)
  const prices = await collectPrices()
  const news = await collectNews()

  console.log("Real evidence collection complete.")
  console.log(`SEC downloaded: ${sec.downloaded}, cached: ${sec.cached}, skipped: ${sec.skipped}`)
  console.log(`ETF parsed: ${etf.parsed}, unavailable: ${etf.unavailable}`)
  console.log(`Price tickers collected: ${prices.tickers}`)
  console.log(`News themes written: ${news.themes}`)
}

main().catch((error) => {
  console.error("Failed to collect real evidence.")
  console.error(error)
  process.exit(1)
})
