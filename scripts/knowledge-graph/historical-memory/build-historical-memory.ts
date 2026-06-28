import { readFile, writeFile } from "node:fs/promises"

type HistoricalEvent = {
  id: string
  title: string
  dateRange: string
  summary: string
  affectedEntities: string[]
  affectedSectors: string[]
  shockTypes: string[]
  sourceUrls: string[]
  evidenceSnippets: string[]
}

function assertArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new Error(`Historical event field "${label}" must be a non-empty string array.`)
  }
}

function validateEvent(event: HistoricalEvent) {
  for (const field of ["id", "title", "dateRange", "summary"] as const) {
    if (typeof event[field] !== "string" || event[field].trim().length === 0) {
      throw new Error(`Historical event field "${field}" is required.`)
    }
  }

  assertArray(event.affectedEntities, "affectedEntities")
  assertArray(event.affectedSectors, "affectedSectors")
  assertArray(event.shockTypes, "shockTypes")
  assertArray(event.sourceUrls, "sourceUrls")
  assertArray(event.evidenceSnippets, "evidenceSnippets")
}

async function main() {
  const sourcePath = "data/evidence/historical-events.json"
  const events = JSON.parse(await readFile(sourcePath, "utf8")) as HistoricalEvent[]

  for (const event of events) {
    validateEvent(event)
  }

  const sorted = [...events].sort((left, right) => left.id.localeCompare(right.id))
  await writeFile(sourcePath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8")
  console.log(`Historical memory validated: ${sorted.length} events.`)
}

main().catch((error) => {
  console.error("Failed to build historical memory.")
  console.error(error)
  process.exit(1)
})
