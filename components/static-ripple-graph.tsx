import type { GraphLink, GraphNode } from "@/lib/finripple-data"
import { cn } from "@/lib/utils"

const typeColor: Record<GraphNode["type"], string> = {
  event: "var(--color-chart-4)",
  commodity: "var(--color-chart-3)",
  sector: "var(--color-chart-2)",
  company: "var(--color-primary)",
  etf: "var(--color-chart-5)",
  country: "var(--color-chart-5)",
}

function radiusFor(score: number) {
  return 2.4 + (score / 100) * 2.6
}

export function StaticRippleGraph({
  nodes,
  links,
  className,
}: {
  nodes: GraphNode[]
  links: GraphLink[]
  className?: string
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]))

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="Financial ripple graph showing how a shock propagates from the event through commodities, sectors, and companies"
      >
        <defs>
          <radialGradient id="ripple-bg" cx="50%" cy="0%" r="90%">
            <stop offset="0%" stopColor="oklch(0.78 0.13 180 / 0.12)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#ripple-bg)" />

        {/* Links */}
        <g>
          {links.map((link, i) => {
            const s = byId.get(link.source)
            const t = byId.get(link.target)
            if (!s || !t) return null
            return (
              <line
                key={`${link.source}-${link.target}-${i}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="var(--color-primary)"
                strokeOpacity={0.12 + link.weight * 0.32}
                strokeWidth={0.25 + link.weight * 0.5}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node) => {
            const r = radiusFor(node.score)
            const color = typeColor[node.type]
            return (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r * 2.1}
                  fill={color}
                  opacity={0.12}
                />
                <circle cx={node.x} cy={node.y} r={r} fill={color} />
              </g>
            )
          })}
        </g>
      </svg>

      {/* Labels (HTML for crisp non-distorted text) */}
      <div className="pointer-events-none absolute inset-0">
        {nodes.map((node) => (
          <span
            key={node.id}
            className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-foreground/80"
            style={{
              left: `${node.x}%`,
              top: `calc(${node.y}% + ${radiusFor(node.score) * 0.9 + 2}px)`,
            }}
          >
            {node.label}
          </span>
        ))}
      </div>
    </div>
  )
}
