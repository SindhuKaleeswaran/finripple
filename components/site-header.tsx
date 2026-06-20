import Link from "next/link"
import { Activity } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
        <Activity className="size-4" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        Fin<span className="text-primary">Ripple</span>
      </span>
    </Link>
  )
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link href="/" className="transition-colors hover:text-foreground">
            Overview
          </Link>
          <Link href="/simulator" className="transition-colors hover:text-foreground">
            Simulator
          </Link>
          <Link href="/results" className="transition-colors hover:text-foreground">
            Dashboard
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            className="hidden sm:inline-flex"
            render={<Link href="/results" />}
          >
            View demo
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/simulator" />}>
            Run a Shock Simulation
          </Button>
        </div>
      </div>
    </header>
  )
}
