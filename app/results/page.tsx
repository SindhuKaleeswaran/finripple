import Link from "next/link"
import {
  ArrowLeft,
  BrainCircuit,
  Building2,
  History,
  PieChart,
  Share2,
  TrendingDown,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { RippleGraph } from "@/components/ripple-graph"
import { ImpactScore } from "@/components/impact-score"
import { getSimulation } from "@/lib/finripple-data"

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>
}) {
  const { scenario } = await searchParams
  const sim = getSimulation(scenario ?? "China restricts rare earth exports")

  const legend = [
    { label: "Event", color: "var(--color-chart-4)" },
    { label: "Commodity", color: "var(--color-chart-3)" },
    { label: "Sector", color: "var(--color-chart-2)" },
    { label: "Company", color: "var(--color-primary)" },
  ]

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Scenario header */}
        <div className="flex flex-col gap-4">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            className="w-fit text-muted-foreground"
            render={<Link href="/simulator" />}
          >
            <ArrowLeft className="size-4" />
            New simulation
          </Button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-primary">
                Simulation result
              </p>
              <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {sim.scenario}
              </h1>
              <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
                {sim.headline}
              </p>
            </div>
            <div className="flex gap-3">
              <Stat label="Severity" value={`${sim.severity}`} accent />
              <Stat label="Confidence" value={`${sim.confidence}%`} />
              <Stat label="Entities" value={`${sim.nodes.length}`} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Ripple graph */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Share2 className="size-4 text-primary" />
                Ripple graph
              </CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                {legend.map((l) => (
                  <span
                    key={l.label}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                    {l.label}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <RippleGraph
                nodes={sim.nodes}
                links={sim.links}
                className="h-[380px] rounded-xl border border-border/60 bg-background/40"
              />
            </CardContent>
          </Card>

          {/* AI explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BrainCircuit className="size-4 text-primary" />
                AI risk explanation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sim.explanation.map((para, i) => (
                <div key={i} className="flex gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {para}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Top impacted companies */}
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Top impacted companies</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sim.companies.map((c) => (
              <Card key={c.ticker} className="border-border/80 bg-card/60">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{c.ticker}</p>
                      <p className="text-xs text-muted-foreground">{c.name}</p>
                    </div>
                    <ImpactScore score={c.score} direction={c.direction} />
                  </div>
                  <span className="w-fit rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {c.sector}
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {c.rationale}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Historical analogy + Portfolio exposure */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4 text-primary" />
                Historical analogy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{sim.analogy.title}</p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {sim.analogy.period}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {sim.analogy.summary}
              </p>
              <Separator />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary">
                  How it played out
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {sim.analogy.outcome}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart className="size-4 text-primary" />
                Portfolio exposure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sim.exposure.map((slice) => (
                <div key={slice.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{slice.label}</span>
                    <span
                      className={
                        slice.drift >= 0
                          ? "tabular-nums font-medium text-[oklch(0.8_0.13_150)]"
                          : "tabular-nums font-medium text-[oklch(0.74_0.17_25)]"
                      }
                    >
                      {slice.drift > 0 ? "+" : ""}
                      {slice.drift}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${Math.min(slice.exposure * 3, 100)}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                      {slice.exposure}%
                    </span>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <TrendingDown className="size-4 shrink-0 text-[oklch(0.74_0.17_25)]" />
                Estimated blended portfolio drift of{" "}
                <span className="font-medium text-foreground">-3.8%</span> under
                this scenario.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="mt-12 border-t border-border/60">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          FinRipple simulations are illustrative model output, not investment
          advice.
        </div>
      </footer>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          accent
            ? "text-xl font-semibold tabular-nums text-primary"
            : "text-xl font-semibold tabular-nums"
        }
      >
        {value}
      </p>
    </div>
  )
}
