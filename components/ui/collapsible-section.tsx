"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"

type CollapsibleSectionProps = {
  title: string
  summary?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-background/50">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-card/40"
      >
        <div className="min-w-0">
          <h2 className="text-sm font-medium">{title}</h2>
          {summary ? (
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
              {summary}
            </div>
          ) : null}
        </div>
        <ChevronDown
          className={[
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open ? "rotate-180" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </button>
      {open ? <div className="border-t border-border/80 p-4">{children}</div> : null}
    </section>
  )
}
