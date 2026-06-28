import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"

export type NewsEvidenceItem = {
  title: string
  url: string
  source: string
  publishedAt: string
  snippet: string
}

export class NewsRetriever {
  constructor(private readonly newsRoot = "data/evidence/news") {}

  async loadTheme(themeId: string): Promise<NewsEvidenceItem[]> {
    const filePath = path.join(process.cwd(), this.newsRoot, `${themeId}.json`)
    if (!existsSync(filePath)) return []

    const parsed = JSON.parse(await readFile(filePath, "utf8")) as { items?: NewsEvidenceItem[] }
    return parsed.items ?? []
  }
}
