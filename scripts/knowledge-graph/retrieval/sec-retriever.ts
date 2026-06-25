import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"

import type { EvidenceDocument, KnowledgeGraphEntity } from "../types"

export class SECTextRetriever {
  constructor(private readonly evidenceRoot = "data/evidence/sec") {}

  async load(entity: KnowledgeGraphEntity): Promise<EvidenceDocument> {
    const filePath = path.join(process.cwd(), this.evidenceRoot, `${entity.entityId}.txt`)

    // TODO: Add optional SEC EDGAR download support for users who want to cache filings locally.
    // TODO: Keep this class offline-first so paid APIs are never required.
    if (!existsSync(filePath)) {
      return {
        entityId: entity.entityId,
        sourceType: "sec_filing",
        text: "",
        status: "missing",
        metadata: { path: filePath },
      }
    }

    return {
      entityId: entity.entityId,
      sourceType: "sec_filing",
      text: await readFile(filePath, "utf8"),
      status: "loaded",
      metadata: await this.loadMetadata(entity.entityId, filePath),
    }
  }

  private async loadMetadata(entityId: string, filePath: string) {
    const metadataPath = path.join(process.cwd(), this.evidenceRoot, `${entityId}.metadata.json`)
    if (!existsSync(metadataPath)) return { path: filePath }

    try {
      const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as Record<string, unknown>
      return {
        path: filePath,
        sourceUrl: typeof metadata.filingUrl === "string" ? metadata.filingUrl : undefined,
        filingDate: typeof metadata.filingDate === "string" ? metadata.filingDate : undefined,
        accessionNumber:
          typeof metadata.accessionNumber === "string" ? metadata.accessionNumber : undefined,
      }
    } catch {
      return { path: filePath }
    }
  }
}
