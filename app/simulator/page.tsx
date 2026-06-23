"use client"

import { useState } from "react"
import { AlertCircle, ArrowRight, Loader2, Sparkles, Zap } from "lucide-react"
import { RippleGraph } from "@/components/RippleGraph"
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
import { Textarea } from "@/components/ui/textarea"
import { examplePrompts } from "@/lib/finripple-data"
import type { RippleEdge, RippleNode } from "@/lib/ripple-engine"

type SimulationApiResult = {
  scenario: string
  startEntityIds: string[]
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
  const [error, setError] = useState<string | null>(null)

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
    } catch (caughtError) {
      setApiResult(null)
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to run simulation.",
      )
    } finally {
      setRunning(false)
    }
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
                disabled={!scenario.trim() || running}
                onClick={() => void runSimulation(scenario)}
                className="sm:w-auto"
              >
                {running ? (
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
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border/80 bg-background/50 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Start entities
                  </div>
                  <div className="mt-1 text-2xl font-semibold">
                    {apiResult.startEntityIds.length}
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

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-medium">Ripple graph</h2>
                  <span className="text-xs text-muted-foreground">
                    Grouped left to right by depth
                  </span>
                </div>
                <RippleGraph
                  nodes={apiResult.result.nodes}
                  edges={apiResult.result.edges}
                  className="h-[360px] sm:h-[460px]"
                />
              </div>

              <div className="mt-6">
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
              </div>
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
                disabled={running}
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
    </div>
  )
}
