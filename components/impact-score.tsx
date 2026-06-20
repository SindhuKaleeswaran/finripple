import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import type { ImpactDirection } from "@/lib/finripple-data"
import { cn } from "@/lib/utils"

export function ImpactScore({
  score,
  direction,
  className,
}: {
  score: number
  direction: ImpactDirection
  className?: string
}) {
  const Icon =
    direction === "positive"
      ? ArrowUpRight
      : direction === "negative"
        ? ArrowDownRight
        : Minus

  const styles =
    direction === "positive"
      ? "bg-[oklch(0.72_0.12_150/0.15)] text-[oklch(0.8_0.13_150)] ring-[oklch(0.72_0.12_150/0.3)]"
      : direction === "negative"
        ? "bg-destructive/15 text-[oklch(0.74_0.17_25)] ring-destructive/30"
        : "bg-muted text-muted-foreground ring-border"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold tabular-nums ring-1",
        styles,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {score > 0 ? "+" : ""}
      {score}
    </span>
  )
}
