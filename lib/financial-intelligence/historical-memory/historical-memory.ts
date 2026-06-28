import type { FinancialEvent, HistoricalEventMatch } from "@/lib/financial-intelligence/types"

const HISTORICAL_EVENTS: HistoricalEventMatch[] = [
  {
    title: "China-Japan rare earth dispute",
    period: "2010-2011",
    score: 0,
    summary: "Export restrictions created a critical-minerals supply shock and repriced downstream exposure.",
    sourceEntityIds: ["CHINA", "RARE_EARTHS", "EV_SECTOR", "DEFENSE"],
  },
  {
    title: "Taiwan and Japan semiconductor earthquake disruptions",
    period: "1999 / 2011",
    score: 0,
    summary: "Earthquake-related production interruptions affected fabs, components, inventory buffers, and downstream electronics.",
    sourceEntityIds: ["TAIWAN", "SEMICONDUCTORS", "TSMC", "AAPL", "NVDA"],
  },
  {
    title: "2008 crude oil shock",
    period: "2007-2008",
    score: 0,
    summary: "A rapid oil price increase compressed fuel-sensitive margins while improving realized prices for energy producers.",
    sourceEntityIds: ["OIL", "ENERGY", "XOM", "CVX"],
  },
  {
    title: "COVID supply-chain shock",
    period: "2020-2022",
    score: 0,
    summary: "Logistics and component shortages propagated through retailers, autos, semiconductors, and consumer demand.",
    sourceEntityIds: ["CHINA", "SEMICONDUCTORS", "CONSUMER_RETAIL", "WMT", "COST"],
  },
]

export class HistoricalMemory {
  findMatches(event: FinancialEvent): HistoricalEventMatch[] {
    const eventEntityIds = new Set(event.mentionedEntityIds)
    const query = event.query.toLowerCase()

    return HISTORICAL_EVENTS.map((historicalEvent) => {
      const entityOverlap = historicalEvent.sourceEntityIds.filter((entityId) => eventEntityIds.has(entityId)).length
      const textOverlap = historicalEvent.summary
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 5 && query.includes(token)).length
      return {
        ...historicalEvent,
        score: Math.min(1, entityOverlap * 0.24 + textOverlap * 0.08),
      }
    })
      .filter((match) => match.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
  }
}
