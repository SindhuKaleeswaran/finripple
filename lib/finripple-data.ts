export type ImpactDirection = "negative" | "positive" | "neutral"

export type ImpactedEntity = {
  ticker: string
  name: string
  sector: string
  score: number // -100 .. 100, magnitude = severity
  direction: ImpactDirection
  rationale: string
}

export type GraphNode = {
  id: string
  label: string
  type: "event" | "commodity" | "company" | "sector" | "etf" | "country"
  score: number // 0..100 severity
  x: number // 0..100 percentage of canvas
  y: number // 0..100 percentage of canvas
}

export type GraphLink = {
  source: string
  target: string
  weight: number // 0..1
}

export type Analogy = {
  title: string
  period: string
  summary: string
  outcome: string
}

export type ExposureSlice = {
  label: string
  exposure: number // percent of portfolio
  drift: number // expected move in %
}

export type SimulationResult = {
  scenario: string
  headline: string
  confidence: number
  severity: number
  explanation: string[]
  companies: ImpactedEntity[]
  nodes: GraphNode[]
  links: GraphLink[]
  analogy: Analogy
  exposure: ExposureSlice[]
}

export const examplePrompts = [
  "China restricts rare earth exports",
  "Taiwan earthquake disrupts semiconductor production",
  "Oil price spike hits airlines",
]

const RARE_EARTH: SimulationResult = {
  scenario: "China restricts rare earth exports",
  headline: "Supply shock cascades from magnets to EVs, defense, and renewables",
  confidence: 82,
  severity: 74,
  explanation: [
    "China controls roughly 70% of rare earth mining and ~90% of refining capacity. An export restriction immediately tightens supply of neodymium and dysprosium used in permanent magnets.",
    "Downstream, electric-vehicle motors, wind turbines, and defense systems face input cost inflation and potential production delays, pressuring margins across the value chain.",
    "Western miners and recyclers outside China see speculative upside as buyers race to secure alternative supply, while broad industrials face a modest drag.",
  ],
  companies: [
    { ticker: "TSLA", name: "Tesla", sector: "Automotive", score: -38, direction: "negative", rationale: "Magnet-dependent EV drivetrains face cost inflation." },
    { ticker: "MP", name: "MP Materials", sector: "Mining", score: 64, direction: "positive", rationale: "Largest non-China rare earth producer benefits from scarcity." },
    { ticker: "GM", name: "General Motors", sector: "Automotive", score: -29, direction: "negative", rationale: "EV roadmap exposed to magnet supply constraints." },
    { ticker: "LMT", name: "Lockheed Martin", sector: "Defense", score: -22, direction: "negative", rationale: "Guidance systems rely on rare earth magnets." },
    { ticker: "ALB", name: "Albemarle", sector: "Specialty Chem", score: 18, direction: "positive", rationale: "Adjacent critical-minerals demand strengthens." },
    { ticker: "VWS", name: "Vestas Wind", sector: "Renewables", score: -26, direction: "negative", rationale: "Turbine generators need rare earth magnets." },
  ],
  nodes: [
    { id: "event", label: "Rare earth export ban", type: "event", score: 95, x: 50, y: 14 },
    { id: "nd", label: "Neodymium", type: "commodity", score: 88, x: 24, y: 38 },
    { id: "dy", label: "Dysprosium", type: "commodity", score: 80, x: 76, y: 38 },
    { id: "auto", label: "EV / Auto", type: "sector", score: 70, x: 18, y: 66 },
    { id: "defense", label: "Defense", type: "sector", score: 58, x: 50, y: 70 },
    { id: "renew", label: "Renewables", type: "sector", score: 62, x: 82, y: 66 },
    { id: "tsla", label: "TSLA", type: "company", score: 66, x: 10, y: 90 },
    { id: "mp", label: "MP", type: "company", score: 64, x: 38, y: 90 },
    { id: "lmt", label: "LMT", type: "company", score: 52, x: 62, y: 90 },
    { id: "vws", label: "VWS", type: "company", score: 56, x: 90, y: 90 },
  ],
  links: [
    { source: "event", target: "nd", weight: 1 },
    { source: "event", target: "dy", weight: 0.9 },
    { source: "nd", target: "auto", weight: 0.85 },
    { source: "nd", target: "defense", weight: 0.6 },
    { source: "dy", target: "renew", weight: 0.8 },
    { source: "dy", target: "defense", weight: 0.65 },
    { source: "auto", target: "tsla", weight: 0.9 },
    { source: "auto", target: "mp", weight: 0.7 },
    { source: "defense", target: "lmt", weight: 0.8 },
    { source: "renew", target: "vws", weight: 0.75 },
  ],
  analogy: {
    title: "2010 China–Japan rare earth dispute",
    period: "Sep 2010 – 2011",
    summary:
      "China curbed rare earth exports to Japan amid a territorial dispute, sending prices of some oxides up more than 500% within months.",
    outcome:
      "Non-China producers re-rated sharply and Western governments launched strategic stockpiles — a template for today's reshoring trade.",
  },
  exposure: [
    { label: "EV & Automotive", exposure: 22, drift: -8.4 },
    { label: "Critical Minerals", exposure: 9, drift: 14.2 },
    { label: "Defense", exposure: 12, drift: -4.1 },
    { label: "Clean Energy", exposure: 15, drift: -6.7 },
    { label: "Broad Industrials", exposure: 18, drift: -2.3 },
  ],
}

const SEMI: SimulationResult = {
  scenario: "Taiwan earthquake disrupts semiconductor production",
  headline: "Foundry downtime ripples into electronics, autos, and cloud capex",
  confidence: 77,
  severity: 81,
  explanation: [
    "Taiwan produces an estimated 60%+ of global semiconductors and over 90% of the most advanced nodes. A major quake risks fab downtime and wafer scrappage.",
    "Lead times for advanced chips extend, squeezing smartphone, PC, automotive, and AI accelerator supply chains that cannot quickly re-source.",
    "Geographically diversified foundries and memory makers outside Taiwan capture share, while fabless designers face near-term shipment risk.",
  ],
  companies: [
    { ticker: "TSM", name: "TSMC", sector: "Semiconductors", score: -58, direction: "negative", rationale: "Direct fab disruption and wafer loss." },
    { ticker: "NVDA", name: "Nvidia", sector: "Semiconductors", score: -41, direction: "negative", rationale: "Advanced node dependency for AI GPUs." },
    { ticker: "AAPL", name: "Apple", sector: "Hardware", score: -33, direction: "negative", rationale: "Leading-edge chip supply for devices." },
    { ticker: "INTC", name: "Intel", sector: "Semiconductors", score: 27, direction: "positive", rationale: "US foundry capacity gains relative appeal." },
    { ticker: "SSNLF", name: "Samsung", sector: "Semiconductors", score: 31, direction: "positive", rationale: "Diversified fabs capture displaced orders." },
    { ticker: "F", name: "Ford", sector: "Automotive", score: -19, direction: "negative", rationale: "Auto MCUs face renewed shortage." },
  ],
  nodes: [
    { id: "event", label: "Taiwan quake", type: "event", score: 96, x: 50, y: 14 },
    { id: "wafer", label: "Adv. wafers", type: "commodity", score: 90, x: 28, y: 40 },
    { id: "memory", label: "Memory", type: "commodity", score: 70, x: 72, y: 40 },
    { id: "semi", label: "Semis", type: "sector", score: 84, x: 22, y: 68 },
    { id: "cloud", label: "AI / Cloud", type: "sector", score: 66, x: 52, y: 72 },
    { id: "auto", label: "Auto", type: "sector", score: 54, x: 82, y: 68 },
    { id: "tsm", label: "TSM", type: "company", score: 80, x: 12, y: 90 },
    { id: "nvda", label: "NVDA", type: "company", score: 70, x: 40, y: 90 },
    { id: "aapl", label: "AAPL", type: "company", score: 60, x: 66, y: 90 },
    { id: "f", label: "F", type: "company", score: 48, x: 90, y: 90 },
  ],
  links: [
    { source: "event", target: "wafer", weight: 1 },
    { source: "event", target: "memory", weight: 0.7 },
    { source: "wafer", target: "semi", weight: 0.95 },
    { source: "wafer", target: "cloud", weight: 0.8 },
    { source: "memory", target: "cloud", weight: 0.6 },
    { source: "memory", target: "auto", weight: 0.55 },
    { source: "semi", target: "tsm", weight: 0.95 },
    { source: "semi", target: "nvda", weight: 0.85 },
    { source: "cloud", target: "aapl", weight: 0.75 },
    { source: "auto", target: "f", weight: 0.7 },
  ],
  analogy: {
    title: "1999 Jiji & 2011 Tōhoku disruptions",
    period: "1999 / 2011",
    summary:
      "Major quakes in Taiwan and Japan halted fabs and component plants, spiking memory and component prices for several quarters.",
    outcome:
      "Supply normalized within 2–3 quarters, but diversified suppliers and inventory builders outperformed through the recovery.",
  },
  exposure: [
    { label: "Semiconductors", exposure: 26, drift: -11.2 },
    { label: "AI & Cloud", exposure: 19, drift: -5.8 },
    { label: "Consumer Hardware", exposure: 14, drift: -4.6 },
    { label: "Foundry (ex-TW)", exposure: 8, drift: 9.1 },
    { label: "Automotive", exposure: 11, drift: -3.2 },
  ],
}

const OIL: SimulationResult = {
  scenario: "Oil price spike hits airlines",
  headline: "Crude surge compresses airline margins and lifts energy producers",
  confidence: 71,
  severity: 63,
  explanation: [
    "A sudden crude spike raises jet fuel costs, which can represent 20–30% of airline operating expenses, directly compressing carrier margins.",
    "Fuel-hedging gaps and limited pricing power mean cost pass-through lags, pressuring near-term earnings for the most exposed carriers.",
    "Integrated oil majors and E&P names benefit from higher realized prices, while consumer discretionary travel demand softens at the margin.",
  ],
  companies: [
    { ticker: "AAL", name: "American Airlines", sector: "Airlines", score: -47, direction: "negative", rationale: "High fuel exposure, thin margins." },
    { ticker: "DAL", name: "Delta Air Lines", sector: "Airlines", score: -34, direction: "negative", rationale: "Better hedged but still pressured." },
    { ticker: "XOM", name: "Exxon Mobil", sector: "Energy", score: 44, direction: "positive", rationale: "Higher realized crude prices lift earnings." },
    { ticker: "CVX", name: "Chevron", sector: "Energy", score: 39, direction: "positive", rationale: "Upstream leverage to oil prices." },
    { ticker: "LUV", name: "Southwest", sector: "Airlines", score: -28, direction: "negative", rationale: "Domestic carrier with fuel sensitivity." },
    { ticker: "MAR", name: "Marriott", sector: "Travel", score: -14, direction: "negative", rationale: "Travel demand softens on higher costs." },
  ],
  nodes: [
    { id: "event", label: "Oil price spike", type: "event", score: 92, x: 50, y: 14 },
    { id: "crude", label: "Crude oil", type: "commodity", score: 88, x: 28, y: 40 },
    { id: "jet", label: "Jet fuel", type: "commodity", score: 82, x: 72, y: 40 },
    { id: "airlines", label: "Airlines", type: "sector", score: 76, x: 22, y: 68 },
    { id: "energy", label: "Energy", type: "sector", score: 64, x: 52, y: 72 },
    { id: "travel", label: "Travel", type: "sector", score: 44, x: 82, y: 68 },
    { id: "aal", label: "AAL", type: "company", score: 74, x: 12, y: 90 },
    { id: "dal", label: "DAL", type: "company", score: 60, x: 40, y: 90 },
    { id: "xom", label: "XOM", type: "company", score: 58, x: 66, y: 90 },
    { id: "mar", label: "MAR", type: "company", score: 40, x: 90, y: 90 },
  ],
  links: [
    { source: "event", target: "crude", weight: 1 },
    { source: "event", target: "jet", weight: 0.9 },
    { source: "jet", target: "airlines", weight: 0.95 },
    { source: "crude", target: "energy", weight: 0.9 },
    { source: "crude", target: "travel", weight: 0.45 },
    { source: "jet", target: "travel", weight: 0.5 },
    { source: "airlines", target: "aal", weight: 0.95 },
    { source: "airlines", target: "dal", weight: 0.8 },
    { source: "energy", target: "xom", weight: 0.85 },
    { source: "travel", target: "mar", weight: 0.6 },
  ],
  analogy: {
    title: "2008 oil shock to $147/bbl",
    period: "2007 – 2008",
    summary:
      "Crude's run toward record highs in 2008 crushed airline profitability and triggered capacity cuts across the industry.",
    outcome:
      "Energy producers led the market until demand destruction set in; airlines that hedged fuel weathered the spike far better.",
  },
  exposure: [
    { label: "Airlines", exposure: 17, drift: -10.6 },
    { label: "Energy Producers", exposure: 13, drift: 8.9 },
    { label: "Travel & Leisure", exposure: 12, drift: -3.8 },
    { label: "Consumer Disc.", exposure: 16, drift: -2.9 },
    { label: "Transports", exposure: 9, drift: -5.1 },
  ],
}

const LIBRARY: SimulationResult[] = [RARE_EARTH, SEMI, OIL]

export function getSimulation(scenario: string): SimulationResult {
  const query = scenario.trim().toLowerCase()
  if (!query) return RARE_EARTH

  const queryWords = new Set(query.split(/[^a-z0-9]+/).filter(Boolean))

  // Score each scenario by the number of distinct keyword overlaps (whole words).
  let best: { sim: SimulationResult; score: number } | null = null
  for (const sim of LIBRARY) {
    const simWords = sim.scenario
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3)
    const overlap = simWords.filter((w) => queryWords.has(w)).length
    if (overlap > 0 && (!best || overlap > best.score)) {
      best = { sim, score: overlap }
    }
  }
  if (best) return { ...best.sim, scenario }

  // Fallback: adapt the rare-earth template to the user's custom scenario.
  return {
    ...RARE_EARTH,
    scenario,
    headline: "Shock propagates across linked sectors, commodities, and equities",
    explanation: [
      `FinRipple mapped "${scenario}" onto its financial knowledge graph and traced second- and third-order exposures.`,
      ...RARE_EARTH.explanation.slice(1),
    ],
  }
}
