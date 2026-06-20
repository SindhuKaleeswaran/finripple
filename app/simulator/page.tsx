"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, Sparkles, Zap } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { examplePrompts } from "@/lib/finripple-data"

export default function SimulatorPage() {
  const router = useRouter()
  const [scenario, setScenario] = useState("")
  const [running, setRunning] = useState(false)

  function runSimulation(value: string) {
    const query = value.trim()
    if (!query || running) return
    setRunning(true)
    router.push(`/results?scenario=${encodeURIComponent(query)}`)
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="text-center">
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

        <Card className="mt-10 border-border/80 bg-card/70">
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
                  runSimulation(scenario)
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
                onClick={() => runSimulation(scenario)}
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

        <div className="mt-8">
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
                  runSimulation(prompt)
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
