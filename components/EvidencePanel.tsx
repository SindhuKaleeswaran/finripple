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

  const quality = evidenceQuality(edge.confidence)
  const isCorrelationOnly = edge.relationshipType === "market_correlation"
  const isScenarioHypothesis = edge.graphSource === "scenario_hypothesis"
  const isEvidenceBacked =
    (edge.evidenceSnippets?.length ?? 0) > 0 &&
    (edge.evidenceSources?.length ?? 0) > 0 &&
    !isScenarioHypothesis &&
    !isCorrelationOnly

  return (
    <aside className="rounded-lg border border-border/80 bg-background/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Evidence
          </p>
          <h3 className="text-base font-semibold">
            {edge.source} <span className="text-muted-foreground">→</span>{" "}
            {edge.target}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={quality.className}>{quality.label}</span>
          <span className="rounded-md border border-border/80 bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
            {relationshipLabel(edge.graphSource, isCorrelationOnly, isEvidenceBacked)}
          </span>
        </div>
      </div>

      {isScenarioHypothesis ? (
        <div className="mt-4 rounded-md border border-[oklch(0.7_0.14_220_/_0.35)] bg-[oklch(0.7_0.14_220_/_0.08)] p-3 text-sm text-muted-foreground">
          This is a scenario hypothesis derived from historical analogies and retrieved context. It is used for runtime propagation and is not a permanent source-backed relationship.
        </div>
      ) : null}

      {isCorrelationOnly ? (
        <div className="mt-4 rounded-md border border-[oklch(0.78_0.16_85_/_0.35)] bg-[oklch(0.78_0.16_85_/_0.08)] p-3 text-sm text-muted-foreground">
          This edge is correlation-only. It indicates historical co-movement, not a proven causal relationship.
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Type" value={edge.relationshipType} />
        <Metric label="Strength" value={edge.strength.toFixed(2)} />
        <Metric
          label="Confidence"
          value={typeof edge.confidence === "number" ? edge.confidence.toFixed(2) : "N/A"}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric
          label="Evidence"
          value={typeof edge.evidenceScore === "number" ? edge.evidenceScore.toFixed(2) : "N/A"}
        />
        <Metric
          label="Reliability"
          value={typeof edge.sourceReliability === "number" ? edge.sourceReliability.toFixed(2) : "N/A"}
        />
        <Metric label="Graph" value={edge.graphSource ?? "persistent"} />
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

function relationshipLabel(
  graphSource: RippleEdge["graphSource"],
  isCorrelationOnly: boolean,
  isEvidenceBacked: boolean,
) {
  if (isCorrelationOnly) return "Correlation-based relationship"
  if (graphSource === "scenario_hypothesis") return "Scenario hypothesis"
  if (isEvidenceBacked) return "Evidence-backed relationship"
  return "Unverified relationship"
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-card/50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono text-sm text-foreground">{value}</div>
    </div>
  )
}

function evidenceQuality(confidence?: number) {
  if (typeof confidence !== "number" || confidence < 0.65) {
    return {
      label: "Weak",
      className:
        "rounded-md border border-[oklch(0.74_0.17_25_/_0.35)] bg-[oklch(0.74_0.17_25_/_0.1)] px-2 py-1 text-xs text-[oklch(0.82_0.16_35)]",
    }
  }

  if (confidence < 0.8) {
    return {
      label: "Moderate",
      className:
        "rounded-md border border-[oklch(0.78_0.16_85_/_0.35)] bg-[oklch(0.78_0.16_85_/_0.1)] px-2 py-1 text-xs text-[oklch(0.86_0.14_85)]",
    }
  }

  return {
    label: "Strong",
    className:
      "rounded-md border border-[oklch(0.78_0.13_180_/_0.35)] bg-[oklch(0.78_0.13_180_/_0.1)] px-2 py-1 text-xs text-primary",
  }
}
