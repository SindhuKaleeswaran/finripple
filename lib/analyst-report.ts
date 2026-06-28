import type { PortfolioExposureResult } from "@/lib/portfolio-exposure"
import type { RippleEdge, RippleNode } from "@/lib/ripple-engine"

export type AnalystReportSection = {
  title: string
  body: string[]
}

export type AnalystReport = {
  title: string
  markdown: string
  sections: AnalystReportSection[]
}

type SimulationForReport = {
  scenario: string
  startEntityIds: string[]
  explanation?: {
    headline: string
    confidence: number
    bulletPoints: string[]
  }
  historicalAnalogies?: Array<{
    title: string
    dateRange: string
    similarity: number
    summary: string
    affectedSectors: string[]
    sourceUrls: string[]
  }>
  result: {
    nodes: RippleNode[]
    edges: RippleEdge[]
    topImpacted: RippleNode[]
  }
}

export function generateAnalystReport(
  simulation: SimulationForReport,
  portfolioExposure?: PortfolioExposureResult | null,
): AnalystReport {
  const sections: AnalystReportSection[] = [
    executiveSummary(simulation),
    primaryTransmissionPath(simulation),
    mostExposed(simulation),
    portfolioSummary(portfolioExposure),
    historicalAnalogy(simulation),
    confidenceAndAssumptions(simulation),
    outcomeChanges(simulation),
    disclaimer(),
  ]

  const title = `FinRipple Analyst Report: ${simulation.scenario}`
  const markdown = toMarkdown(title, sections)

  return {
    title,
    markdown,
    sections,
  }
}

function executiveSummary(simulation: SimulationForReport): AnalystReportSection {
  const topImpacted = simulation.result.topImpacted
    .filter((node) => node.depth > 0)
    .slice(0, 4)
    .map((node) => `${node.entityId} (${node.impactScore.toFixed(1)})`)
    .join(", ")

  return {
    title: "Executive Summary",
    body: [
      simulation.explanation?.headline ??
        "FinRipple simulated the shock through the current evidence graph and scenario-hypothesis graph.",
      topImpacted
        ? `The highest impacted non-root entities in this run are ${topImpacted}.`
        : "The simulation did not identify material downstream entities beyond the initial shock nodes.",
      `Initial shock nodes: ${simulation.startEntityIds.join(", ")}.`,
    ],
  }
}

function primaryTransmissionPath(simulation: SimulationForReport): AnalystReportSection {
  const strongestPath = buildStrongestPath(simulation.result.topImpacted, simulation.result.edges)
  const pathText = strongestPath.length > 1 ? strongestPath.join(" -> ") : "No multi-hop path was identified."
  const pathEdges = summarizePathEdges(strongestPath, simulation.result.edges)
  const semiconductorContext = simulation.startEntityIds.includes("SEMICONDUCTORS")
    ? [
        "Semiconductor infrastructure is treated as an initial affected layer because the scenario explicitly describes production disruption and the simulation seeded SEMICONDUCTORS as a shock node.",
      ]
    : []

  return {
    title: "Primary Shock Transmission Path",
    body: [
      ...semiconductorContext,
      `Primary path: ${pathText}.`,
      ...pathEdges,
    ],
  }
}

function mostExposed(simulation: SimulationForReport): AnalystReportSection {
  const rows = simulation.result.topImpacted
    .filter((node) => node.depth > 0)
    .slice(0, 6)
    .map((node) => {
      const incoming = simulation.result.edges.find(
        (edge) => edge.target === node.entityId && edge.source === node.parent,
      )
      const basis = incoming?.graphSource === "scenario_hypothesis"
        ? "scenario hypothesis"
        : incoming?.relationshipType ?? "ripple propagation"
      return `${node.entityId}: impact ${node.impactScore.toFixed(1)}, depth ${node.depth}, basis: ${basis}.`
    })

  return {
    title: "Most Exposed Companies/Sectors",
    body: rows.length > 0 ? rows : ["No downstream company or sector exposure was identified."],
  }
}

function portfolioSummary(portfolioExposure?: PortfolioExposureResult | null): AnalystReportSection {
  if (!portfolioExposure) {
    return {
      title: "Portfolio Exposure Summary",
      body: ["No portfolio exposure analysis has been run for this simulation yet."],
    }
  }

  const exposed = [...portfolioExposure.holdings]
    .sort((left, right) => right.exposureScore - left.exposureScore)
    .slice(0, 5)
    .map((holding) =>
      `${holding.inputSymbol}: ${holding.exposureLevel} exposure (${holding.exposureScore.toFixed(1)}). ${holding.reason} Path: ${
        holding.path.length > 0 ? holding.path.join(" -> ") : "unmatched"
      }.`,
    )

  return {
    title: "Portfolio Exposure Summary",
    body: [
      `Overall portfolio risk score is ${portfolioExposure.overallRiskScore.toFixed(1)} (${portfolioExposure.riskLevel}).`,
      ...exposed,
    ],
  }
}

function historicalAnalogy(simulation: SimulationForReport): AnalystReportSection {
  const analogy = simulation.historicalAnalogies?.[0]
  if (!analogy) {
    return {
      title: "Historical Analogy",
      body: ["No close historical analogy was retrieved for this scenario."],
    }
  }

  return {
    title: "Historical Analogy",
    body: [
      `Closest retrieved analogy: ${analogy.title} (${analogy.dateRange}), similarity ${(analogy.similarity * 100).toFixed(0)}%.`,
      analogy.summary,
      `Affected sectors in the analogy: ${analogy.affectedSectors.slice(0, 6).join(", ")}.`,
    ],
  }
}

function confidenceAndAssumptions(simulation: SimulationForReport): AnalystReportSection {
  const evidenceBacked = simulation.result.edges.filter((edge) => edge.graphSource === "dynamic_evidence").length
  const hypotheses = simulation.result.edges.filter((edge) => edge.graphSource === "scenario_hypothesis").length
  const correlations = simulation.result.edges.filter((edge) => edge.relationshipType === "market_correlation").length

  return {
    title: "Confidence and Assumptions",
    body: [
      `System confidence: ${simulation.explanation?.confidence ?? "not available"}%.`,
      `The graph used ${evidenceBacked} evidence-backed edges, ${hypotheses} scenario-hypothesis edges, and ${correlations} correlation-based edges.`,
      "Scenario-hypothesis edges are temporary runtime assumptions derived from retrieved historical analogies and local graph context; they are not permanent factual relationships.",
      "Impact scores are relative scenario severity estimates, not price forecasts.",
    ],
  }
}

function outcomeChanges(simulation: SimulationForReport): AnalystReportSection {
  const edgeTypes = Array.from(new Set(simulation.result.edges.map((edge) => edge.relationshipType))).slice(0, 5)
  return {
    title: "What Could Change the Outcome",
    body: [
      "The outcome could change if new evidence alters the source reliability, affected entities, or relationship confidence in the temporary graph.",
      edgeTypes.length > 0
        ? `Most of this run depends on these relationship types: ${edgeTypes.join(", ")}.`
        : "No relationship types were available to stress test.",
      "Mitigating factors could include diversified suppliers, inventory buffers, policy exemptions, alternative production geography, or demand substitution.",
    ],
  }
}

function disclaimer(): AnalystReportSection {
  return {
    title: "Not Investment Advice Disclaimer",
    body: [
      "This report is generated from FinRipple simulation data for research and educational use. It is not investment advice, a recommendation, or a forecast of security prices.",
    ],
  }
}

function buildStrongestPath(nodes: RippleNode[], edges: RippleEdge[]) {
  const target = nodes
    .filter((node) => node.depth > 0)
    .sort((left, right) => right.impactScore - left.impactScore)[0]

  if (!target) return []

  const path = [target.entityId]
  let current = target
  const nodeById = new Map(nodes.map((node) => [node.entityId, node]))

  while (current.parent) {
    path.unshift(current.parent)
    const parent = nodeById.get(current.parent)
    if (!parent) break
    current = parent
  }

  const hasEdges = path.every((entityId, index) => {
    if (index === 0) return true
    return edges.some((edge) => edge.source === path[index - 1] && edge.target === entityId)
  })

  return hasEdges ? path : []
}

function summarizePathEdges(path: string[], edges: RippleEdge[]) {
  if (path.length <= 1) return []

  return path.slice(1).flatMap((target, index) => {
    const source = path[index]
    const edge = edges.find((candidate) => candidate.source === source && candidate.target === target)
    if (!edge) return []

    const label =
      edge.graphSource === "scenario_hypothesis"
        ? "scenario hypothesis"
        : edge.relationshipType === "market_correlation"
          ? "correlation-based"
          : "evidence-backed"

    return `${source} -> ${target}: ${edge.evidenceSummary ?? edge.explanation ?? edge.relationshipType} (${label}).`
  })
}

function toMarkdown(title: string, sections: AnalystReportSection[]) {
  return [
    `# ${title}`,
    "",
    ...sections.flatMap((section) => [
      `## ${section.title}`,
      "",
      ...section.body.map((paragraph) => `${paragraph}`),
      "",
    ]),
  ].join("\n")
}
