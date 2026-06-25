import { ExternalLink } from "lucide-react"

import type { RippleEdge } from "@/lib/ripple-engine"

export function EvidencePanel({ edge }: { edge: RippleEdge | null }) {
  if (!edge) {
    return (
      <aside className="rounded-lg border border-border/80 bg-background/50 p-4 text-sm text-muted-foreground">
        Select a ripple connection to view evidence.
      </aside>
    )
  }

  return (
    <aside className="rounded-lg border border-border/80 bg-background/50 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Evidence
        </p>
        <h3 className="text-base font-semibold">
          {edge.source} <span className="text-muted-foreground">→</span>{" "}
          {edge.target}
        </h3>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Type" value={edge.relationshipType} />
        <Metric label="Strength" value={edge.strength.toFixed(2)} />
        <Metric
          label="Confidence"
          value={typeof edge.confidence === "number" ? edge.confidence.toFixed(2) : "N/A"}
        />
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Summary
        </p>
        <p className="text-sm leading-relaxed text-foreground/90">
          {edge.evidenceSummary || "No evidence summary was provided for this relationship."}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Evidence snippets
        </p>
        {edge.evidenceSnippets && edge.evidenceSnippets.length > 0 ? (
          <div className="space-y-2">
            {edge.evidenceSnippets.map((snippet, index) => (
              <blockquote
                key={`${edge.source}-${edge.target}-snippet-${index}`}
                className="rounded-md border border-border/70 bg-card/50 p-3 text-sm leading-relaxed text-muted-foreground"
              >
                {snippet}
              </blockquote>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No snippets available.</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Sources
        </p>
        {edge.evidenceSources && edge.evidenceSources.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {edge.evidenceSources.map((source) => (
              <span
                key={`${edge.source}-${edge.target}-${source}`}
                className="rounded-md border border-border/80 bg-muted/40 px-2 py-1 text-xs text-muted-foreground"
              >
                {source}
              </span>
            ))}
          </div>
        ) : null}

        {edge.evidenceUrls && edge.evidenceUrls.length > 0 ? (
          <div className="space-y-1.5">
            {edge.evidenceUrls.map((url, index) => (
              <a
                key={`${edge.source}-${edge.target}-url-${index}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 truncate text-sm text-primary hover:underline"
              >
                <ExternalLink className="size-3.5 shrink-0" />
                <span className="truncate">{url}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No source URLs available.</p>
        )}
      </div>
    </aside>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-card/50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono text-sm text-foreground">{value}</div>
    </div>
  )
}
