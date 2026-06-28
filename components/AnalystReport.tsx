"use client"

import { Clipboard, Download } from "lucide-react"

import type { AnalystReport as AnalystReportModel } from "@/lib/analyst-report"
import { Button } from "@/components/ui/button"

export function AnalystReport({ report }: { report: AnalystReportModel }) {
  async function copyReport() {
    await navigator.clipboard.writeText(report.markdown)
  }

  function exportMarkdown() {
    const blob = new Blob([report.markdown], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "finripple-analyst-report.md"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="rounded-lg border border-border/80 bg-background/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Analyst Report
          </p>
          <h2 className="mt-1 text-base font-semibold">{report.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copyReport}>
            <Clipboard className="size-4" />
            Copy report
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportMarkdown}>
            <Download className="size-4" />
            Export as Markdown
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        {report.sections.map((section) => (
          <div key={section.title} className="rounded-md border border-border/70 bg-card/40 p-3">
            <h3 className="text-sm font-medium">{section.title}</h3>
            <div className="mt-2 space-y-2">
              {section.body.map((paragraph, index) => (
                <p
                  key={`${section.title}-${index}`}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
