"use client"

import { useState } from "react"
import { AlertCircle, ArrowRight, Briefcase, Loader2, Sparkles, Zap } from "lucide-react"
import { AnalystReport } from "@/components/AnalystReport"
import { EvidencePanel } from "@/components/EvidencePanel"
import { RippleGraph } from "@/components/RippleGraph"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { Textarea } from "@/components/ui/textarea"
import { examplePrompts } from "@/lib/finripple-data"
import { generateAnalystReport } from "@/lib/analyst-report"
import {
  calculatePortfolioExposure,
  type PortfolioExposureResult,
} from "@/lib/portfolio-exposure"
import type { RippleEdge, RippleNode } from "@/lib/ripple-engine"

type SimulationApiResult = {
  scenario: string
  startEntityIds: string[]
  architecture?: string[]
  evidenceSummary?: {
    retrievedChunks: number
    evidenceBackedEdges?: number
    scenarioHypothesisEdges?: number
    persistentDynamoEdges?: number
    finalEdges?: number
    dynamicRelationships: number
    dynamoDbRelationships: number
    persistentRelationshipsMerged: number
    mergedRelationships: number
    prunedRelationships: number
  }
  explanation?: {
    headline: string
    confidence: number
    bulletPoints: string[]
  }
  historicalAnalogies?: Array<{
    id?: string
    title: string
    dateRange: string
    similarity: number
    summary: string
    affectedEntities?: string[]
    affectedSectors: string[]
    shockTypes?: string[]
    sourceUrls: string[]
    evidenceSnippets?: string[]
  }>
  result: {
    nodes: RippleNode[]
    edges: RippleEdge[]
    topImpacted: RippleNode[]
  }
}

export default function SimulatorPage() {
  const [scenario, setScenario] = useState("")
  const [running, setRunning] = useState(false)
  const [apiResult, setApiResult] = useState<SimulationApiResult | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<RippleEdge | null>(null)
  const [portfolioInput, setPortfolioInput] = useState("NVDA, TSLA, AAPL, MSFT")
  const [portfolioExposure, setPortfolioExposure] =
    useState<PortfolioExposureResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isLoading = running
  const scenarioText = typeof scenario === "string" ? scenario : "";
  const isRunDisabled = Boolean(isLoading || scenarioText.trim().length === 0);
  const isPortfolioAnalyzeDisabled = Boolean(portfolioInput.trim().length === 0)
  const analystReport = apiResult
    ? generateAnalystReport(apiResult, portfolioExposure)
    : null

  async function runSimulation(value: string) {
    const query = value.trim()
    if (!query || running) return

    setRunning(true)
    setError(null)

    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scenario: query }),
      })

      const payload = (await response.json()) as
        | SimulationApiResult
        | { error?: string }

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Failed to run simulation.",
        )
      }

      setApiResult(payload as SimulationApiResult)
      setSelectedEdge(null)
      setPortfolioExposure(null)
    } catch (caughtError) {
      setApiResult(null)
      setSelectedEdge(null)
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to run simulation.",
      )
    } finally {
      setRunning(false)
    }
  }

  function analyzePortfolio() {
    if (!apiResult || !portfolioInput.trim()) return
    setPortfolioExposure(
      calculatePortfolioExposure(portfolioInput, apiResult.result),
    )
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Zap className="size-3 text-primary" />
            Market Shock Simulator
          </span>
          <h1 className="mt-6 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Describe a market event
          </h1>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            FinRipple traces the shock through its financial knowledge graph and
            estimates the impact on companies, sectors, and commodities.
          </p>
        </div>

        <Card className="mx-auto mt-10 max-w-3xl border-border/80 bg-card/70">
          <CardContent className="p-5 sm:p-6">
            <label htmlFor="scenario" className="text-sm font-medium">
              Shock scenario
            </label>
            <Textarea
              id="scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  void runSimulation(scenario)
                }
              }}
              placeholder="e.g. China restricts rare earth exports, triggering a global magnet shortage..."
              className="mt-2 min-h-32 resize-none bg-background/60 text-base"
            />
            <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Tip: press{" "}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘ Enter
                </kbd>{" "}
                to run
              </p>
              <Button
                size="lg"
                disabled={isRunDisabled}
                onClick={() => void runSimulation(scenario)}
                className="sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Simulating…
                  </>
                ) : (
                  <>
                    Run Simulation
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        {apiResult ? (
          <Card className="mt-8 border-border/80 bg-card/75">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Simulation Results</CardTitle>
                  <CardDescription className="mt-1">
                    Live ripple output for "{apiResult.scenario}"
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {apiResult.startEntityIds.map((entityId) => (
                    <Badge key={entityId} variant="outline">
                      {entityId}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CollapsibleSection
                title="Simulation Results / Summary"
                defaultOpen
                summary={
                  <>
                    <span>Evidence {apiResult.evidenceSummary?.retrievedChunks ?? 0}</span>
                    <span>Nodes {apiResult.result.nodes.length}</span>
                    <span>Edges {apiResult.result.edges.length}</span>
                    <span>Confidence {apiResult.explanation?.confidence ?? "N/A"}%</span>
                  </>
                }
              >
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border/80 bg-background/50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Evidence
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {apiResult.evidenceSummary?.retrievedChunks ?? 0}
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 bg-background/50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Nodes
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {apiResult.result.nodes.length}
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 bg-background/50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Edges
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {apiResult.result.edges.length}
                  </div>
                </div>
              </div>

              {apiResult.explanation ? (
                <div className="mt-4 rounded-lg border border-border/80 bg-background/50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Evidence-grounded explanation
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                        {apiResult.explanation.headline}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {apiResult.explanation.confidence}% confidence
                    </Badge>
                  </div>
                  {apiResult.explanation.bulletPoints.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {apiResult.explanation.bulletPoints.slice(0, 4).map((point, index) => (
                        <p key={`explanation-${index}`} className="text-sm text-muted-foreground">
                          {point}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {apiResult.evidenceSummary ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    Evidence-backed: {apiResult.evidenceSummary.evidenceBackedEdges ?? apiResult.evidenceSummary.dynamicRelationships}
                  </Badge>
                  <Badge variant="outline">
                    Hypotheses: {apiResult.evidenceSummary.scenarioHypothesisEdges ?? 0}
                  </Badge>
                  <Badge variant="outline">
                    DynamoDB edges: {apiResult.evidenceSummary.persistentDynamoEdges ?? apiResult.evidenceSummary.dynamoDbRelationships}
                  </Badge>
                  <Badge variant="outline">
                    Final edges: {apiResult.evidenceSummary.finalEdges ?? apiResult.evidenceSummary.mergedRelationships}
                  </Badge>
                  <Badge variant="outline">
                    Pruned: {apiResult.evidenceSummary.prunedRelationships}
                  </Badge>
                </div>
              ) : null}
              </CollapsibleSection>

              {apiResult.historicalAnalogies && apiResult.historicalAnalogies.length > 0 ? (
                <CollapsibleSection
                  title="Historical Analogies"
                  summary={`${apiResult.historicalAnalogies.length} retrieved`}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Historical analogies
                  </p>
                  <div className="mt-3 grid gap-3">
                    {apiResult.historicalAnalogies.map((analogy) => (
                      <div
                        key={`${analogy.title}-${analogy.dateRange}`}
                        className="rounded-md border border-border/70 bg-card/40 p-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="font-medium">{analogy.title}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {analogy.dateRange}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {(analogy.similarity * 100).toFixed(0)}% similar
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {analogy.summary}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {analogy.affectedSectors.slice(0, 5).map((sector) => (
                            <span
                              key={`${analogy.title}-${sector}`}
                              className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {sector}
                            </span>
                          ))}
                        </div>
                        {analogy.sourceUrls.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {analogy.sourceUrls.slice(0, 2).map((url, index) => (
                              <a
                                key={`${analogy.title}-source-${index}`}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate text-xs text-primary hover:underline"
                              >
                                Source {index + 1}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              ) : null}

              <CollapsibleSection
                title="Portfolio Exposure"
                summary={
                  portfolioExposure
                    ? `${portfolioExposure.overallRiskScore.toFixed(2)} / ${portfolioExposure.riskLevel}`
                    : "Not analyzed"
                }
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Briefcase className="size-3.5 text-primary" />
                      Portfolio Exposure
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Analyze holdings against this simulation's ripple graph.
                    </p>
                  </div>
                  {portfolioExposure ? (
                    <Badge variant="outline">
                      {portfolioExposure.riskLevel} risk
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Textarea
                    value={portfolioInput}
                    onChange={(event) => setPortfolioInput(event.target.value)}
                    placeholder="Enter tickers: NVDA, TSLA, AAPL"
                    className="min-h-16 flex-1 resize-none bg-background/60"
                  />
                  <Button
                    type="button"
                    onClick={analyzePortfolio}
                    disabled={Boolean(isPortfolioAnalyzeDisabled)}
                    className="sm:self-start"
                  >
                    Analyze Exposure
                    <ArrowRight className="size-4" />
                  </Button>
                </div>

                {portfolioExposure ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-md border border-border/70 bg-card/50 p-3">
                        <div className="text-xs text-muted-foreground">
                          Overall score
                        </div>
                        <div className="mt-1 text-2xl font-semibold tabular-nums">
                          {portfolioExposure.overallRiskScore.toFixed(2)}
                        </div>
                      </div>
                      <div className="rounded-md border border-border/70 bg-card/50 p-3">
                        <div className="text-xs text-muted-foreground">
                          Risk level
                        </div>
                        <div className="mt-1 text-2xl font-semibold">
                          {portfolioExposure.riskLevel}
                        </div>
                      </div>
                      <div className="rounded-md border border-border/70 bg-card/50 p-3">
                        <div className="text-xs text-muted-foreground">
                          Matched holdings
                        </div>
                        <div className="mt-1 text-2xl font-semibold tabular-nums">
                          {
                            portfolioExposure.holdings.filter(
                              (holding) => holding.matched,
                            ).length
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-medium">
                        Most exposed holdings
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        Sorted by exposure score
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-border/80">
                      <div className="grid grid-cols-[1fr_auto] gap-3 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid-cols-[0.8fr_auto_auto_1.4fr]">
                        <span>Holding</span>
                        <span className="text-right">Exposure</span>
                        <span className="hidden text-right sm:block">
                          Level
                        </span>
                        <span className="hidden sm:block">Reason</span>
                      </div>
                      <div className="divide-y divide-border/80">
                        {[...portfolioExposure.holdings]
                          .sort((left, right) => right.exposureScore - left.exposureScore)
                          .map((holding) => (
                            <div
                              key={`${holding.inputSymbol}-${holding.entityId}`}
                              className="grid grid-cols-[1fr_auto] gap-3 px-3 py-3 text-sm sm:grid-cols-[0.8fr_auto_auto_1.4fr]"
                            >
                              <div className="min-w-0">
                                <div className="font-medium">
                                  {holding.inputSymbol}
                                </div>
                                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {holding.matched
                                    ? holding.path.join(" → ")
                                    : "Unmatched"}
                                </div>
                              </div>
                              <div className="font-mono tabular-nums">
                                {holding.exposureScore.toFixed(2)}
                              </div>
                              <div className="hidden text-right sm:block">
                                <span className={exposureLevelClass(holding.exposureLevel)}>
                                  {holding.exposureLevel}
                                </span>
                              </div>
                              <div className="hidden min-w-0 text-muted-foreground sm:block">
                                {holding.reason}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {portfolioExposure.unmatchedHoldings.length > 0 ? (
                      <div className="text-sm text-muted-foreground">
                        Unmatched:{" "}
                        {portfolioExposure.unmatchedHoldings
                          .map((holding) => holding.inputSymbol)
                          .join(", ")}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CollapsibleSection>

              {analystReport ? (
                <CollapsibleSection title="Analyst Report" defaultOpen summary="Generated">
                  <AnalystReport report={analystReport} />
                </CollapsibleSection>
              ) : null}

              <CollapsibleSection
                title="Ripple Graph"
                summary={`${apiResult.result.nodes.length} nodes / ${apiResult.result.edges.length} edges`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-medium">Ripple graph</h2>
                  <span className="text-xs text-muted-foreground">
                    Grouped left to right by depth
                  </span>
                </div>
                <RippleGraph
                  nodes={apiResult.result.nodes}
                  edges={apiResult.result.edges}
                  selectedEdge={selectedEdge}
                  onEdgeSelect={setSelectedEdge}
                  className="h-[360px] sm:h-[460px]"
                />
              </CollapsibleSection>

              <CollapsibleSection
                title="Evidence Details"
                summary={selectedEdge ? `${selectedEdge.source} -> ${selectedEdge.target}` : "Select an edge"}
              >
                <EvidencePanel edge={selectedEdge} />
              </CollapsibleSection>

              <CollapsibleSection
                title="Top Impacted Entities"
                summary={`${apiResult.result.topImpacted.length} ranked`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-medium">
                    Top impacted entities
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Sorted by impact score
                  </span>
                </div>
                <div className="mt-3 overflow-hidden rounded-lg border border-border/80">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid-cols-[1fr_auto_auto_1fr]">
                    <span>Entity</span>
                    <span className="text-right">Impact</span>
                    <span className="text-right">Depth</span>
                    <span className="hidden sm:block">Parent</span>
                  </div>
                  <div className="divide-y divide-border/80">
                    {apiResult.result.topImpacted.slice(0, 8).map((node) => (
                      <div
                        key={`${node.entityId}-${node.depth}-${node.parent ?? "root"}`}
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-3 text-sm sm:grid-cols-[1fr_auto_auto_1fr]"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {node.entityId}
                          </div>
                          {node.parent ? (
                            <div className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                              Parent: {node.parent}
                            </div>
                          ) : null}
                        </div>
                        <div className="font-mono text-sm tabular-nums">
                          {node.impactScore.toFixed(2)}
                        </div>
                        <div className="font-mono text-sm tabular-nums">
                          {node.depth}
                        </div>
                        <div className="hidden min-w-0 truncate text-muted-foreground sm:block">
                          {node.parent ?? "Initial shock"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleSection>
            </CardContent>
          </Card>
        ) : null}

        <div className="mx-auto mt-8 max-w-3xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 text-primary" />
            Example prompts
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {examplePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setScenario(prompt)
                  void runSimulation(prompt)
                }}
                disabled={Boolean(isLoading)}
                className="group flex h-full flex-col gap-2 rounded-xl border border-border/80 bg-card/50 p-4 text-left text-sm transition-colors hover:border-primary/40 hover:bg-card disabled:opacity-60"
              >
                <span className="font-medium leading-snug text-foreground">
                  {prompt}
                </span>
                <span className="mt-auto inline-flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Simulate <ArrowRight className="size-3" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function exposureLevelClass(level: string) {
  if (level === "High") {
    return "rounded-md bg-[oklch(0.74_0.17_25_/_0.12)] px-2 py-0.5 text-xs text-[oklch(0.82_0.16_35)]"
  }

  if (level === "Medium") {
    return "rounded-md bg-[oklch(0.78_0.16_85_/_0.12)] px-2 py-0.5 text-xs text-[oklch(0.86_0.14_85)]"
  }

  if (level === "Low") {
    return "rounded-md bg-[oklch(0.7_0.14_220_/_0.12)] px-2 py-0.5 text-xs text-[oklch(0.76_0.13_220)]"
  }

  return "rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
}
