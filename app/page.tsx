import Link from "next/link"
import {
  ArrowRight,
  Share2,
  Waves,
  PieChart,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StaticRippleGraph } from "@/components/static-ripple-graph"
import { getSimulation } from "@/lib/finripple-data"

const features = [
  {
    icon: Share2,
    title: "Financial Knowledge Graph",
    desc: "A living map linking companies, sectors, ETFs, commodities, and countries by real economic dependencies.",
  },
  {
    icon: Waves,
    title: "Market Shock Simulator",
    desc: "Inject any market event and watch the shockwave propagate across first-, second-, and third-order exposures.",
  },
  {
    icon: PieChart,
    title: "Portfolio Exposure Analysis",
    desc: "Quantify how a scenario hits your holdings with per-sleeve drift estimates and concentration warnings.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Risk Explanation",
    desc: "Plain-English narratives explain why each entity moves, with historical analogies for context.",
  },
]

const stats = [
  { value: "12K+", label: "Linked entities" },
  { value: "48", label: "Tracked sectors" },
  { value: "3rd-order", label: "Ripple depth" },
  { value: "<2s", label: "Simulation time" },
]

export default function LandingPage() {
  const preview = getSimulation("China restricts rare earth exports")

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.78_0.13_180/0.12),transparent)]"
          />
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-8 lg:px-8 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" />
                Financial shockwave intelligence
              </span>
              <h1 className="mt-6 text-pretty text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Simulate the butterfly effect of financial shocks.
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
                Enter a market event like a rare earth export ban or a
                semiconductor disruption, and FinRipple shows exactly how it
                ripples through companies, sectors, ETFs, commodities, and
                countries.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  nativeButton={false}
                  render={<Link href="/simulator" />}
                >
                  Run a Shock Simulation
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/results" />}
                >
                  Explore a live result
                </Button>
              </div>
              <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label} className="bg-card px-4 py-4">
                    <dt className="text-2xl font-semibold tracking-tight">
                      {s.value}
                    </dt>
                    <dd className="mt-1 text-xs text-muted-foreground">
                      {s.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <Card className="relative overflow-hidden border-border/80 bg-card/70 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="size-4 text-primary" />
                  Live ripple preview
                </div>
                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                  Severity {preview.severity}
                </span>
              </div>
              <CardContent className="p-0">
                <StaticRippleGraph
                  nodes={preview.nodes}
                  links={preview.links}
                  className="h-[340px]"
                />
              </CardContent>
              <div className="border-t border-border/60 px-5 py-3 text-sm text-muted-foreground">
                {preview.scenario}
              </div>
            </Card>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              An institutional view of contagion, on demand
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              FinRipple combines a financial knowledge graph with scenario
              modeling and AI explanations so you can stress-test ideas in
              seconds.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card
                key={f.title}
                className="group h-full border-border/80 bg-card/60 transition-colors hover:border-primary/40"
              >
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/20">
                    <f.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-base font-semibold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {f.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <Card className="relative overflow-hidden border-primary/30 bg-card">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_120%_at_100%_0%,oklch(0.78_0.13_180/0.16),transparent)]"
            />
            <CardContent className="relative flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between lg:p-12">
              <div className="max-w-xl">
                <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                  Ready to trace your first shockwave?
                </h2>
                <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                  Describe a market event in plain language and let FinRipple do
                  the rest.
                </p>
              </div>
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/simulator" />}
              >
                Run a Shock Simulation
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
