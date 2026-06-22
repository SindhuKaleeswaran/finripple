import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'

type Entity = {
  entityId: string
  name: string
  entityType: string
  ticker?: string
  sector?: string
  region?: string
}

type Relationship = {
  relationshipId: string
  sourceEntityId: string
  targetEntityId: string
  relationshipType: string
  strength: number
  riskCategory: string
  direction: string
  explanation: string
}

function loadEnvLocal() {
  if (!existsSync('.env.local')) return

  const lines = readFileSync('.env.local', 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    const value = rawValue.replace(/^["']|["']$/g, '')

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

async function loadJson<T>(path: URL): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

async function batchWrite(tableName: string, items: Record<string, unknown>[]) {
  const { dynamoDBDocumentClient } = await import('../lib/dynamodb')

  let writtenCount = 0
  for (const itemChunk of chunk(items, 25)) {
    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: itemChunk.map((item) => ({
          PutRequest: { Item: item },
        })),
      },
    })

    const response = await dynamoDBDocumentClient.send(command)
    writtenCount += itemChunk.length

    let unprocessed = response.UnprocessedItems?.[tableName] ?? []
    while (unprocessed.length > 0) {
      const retryResponse = await dynamoDBDocumentClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: unprocessed,
          },
        }),
      )

      unprocessed = retryResponse.UnprocessedItems?.[tableName] ?? []
    }
  }

  return writtenCount
}

async function main() {
  loadEnvLocal()

  const { TABLES } = await import('../lib/dynamodb')
  const entities = await loadJson<Entity[]>(new URL('../data/entities.json', import.meta.url))
  const relationships = await loadJson<Relationship[]>(new URL('../data/relationships.json', import.meta.url))

  const entityCount = await batchWrite(TABLES.entities, entities)
  const relationshipCount = await batchWrite(TABLES.relationships, relationships)

  console.log(`Seeded ${entityCount} entities into ${TABLES.entities}.`)
  console.log(`Seeded ${relationshipCount} relationships into ${TABLES.relationships}.`)
}

main().catch((error) => {
  console.error('Failed to seed DynamoDB.')
  console.error(error)
  process.exit(1)
})
