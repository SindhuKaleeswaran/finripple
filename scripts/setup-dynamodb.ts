import {
  BillingMode,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
  waitUntilTableExists,
  type AttributeDefinition,
  type KeySchemaElement,
} from '@aws-sdk/client-dynamodb'
import { existsSync, readFileSync } from 'node:fs'

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

async function tableExists(tableName: string) {
  const { dynamoDBClient } = await import('../lib/dynamodb')

  try {
    await dynamoDBClient.send(new DescribeTableCommand({ TableName: tableName }))
    return true
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      return false
    }

    throw error
  }
}

async function ensureTable({
  tableName,
  keySchema,
  attributeDefinitions,
}: {
  tableName: string
  keySchema: KeySchemaElement[]
  attributeDefinitions: AttributeDefinition[]
}) {
  const { dynamoDBClient } = await import('../lib/dynamodb')

  if (await tableExists(tableName)) {
    console.log(`DynamoDB table ${tableName} already exists.`)
    return
  }

  console.log(`Creating DynamoDB table ${tableName}.`)
  await dynamoDBClient.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: BillingMode.PAY_PER_REQUEST,
      KeySchema: keySchema,
      AttributeDefinitions: attributeDefinitions,
    }),
  )

  const waiter = await waitUntilTableExists(
    { client: dynamoDBClient, maxWaitTime: 120 },
    { TableName: tableName },
  )

  if (waiter.state !== 'SUCCESS') {
    throw new Error(`Timed out waiting for DynamoDB table ${tableName} to become active.`)
  }

  console.log(`DynamoDB table ${tableName} is active.`)
}

async function main() {
  loadEnvLocal()

  const { TABLES } = await import('../lib/dynamodb')

  await ensureTable({
    tableName: TABLES.entities,
    keySchema: [{ AttributeName: 'entityId', KeyType: 'HASH' }],
    attributeDefinitions: [{ AttributeName: 'entityId', AttributeType: 'S' }],
  })

  await ensureTable({
    tableName: TABLES.relationships,
    keySchema: [
      { AttributeName: 'sourceEntityId', KeyType: 'HASH' },
      { AttributeName: 'relationshipId', KeyType: 'RANGE' },
    ],
    attributeDefinitions: [
      { AttributeName: 'sourceEntityId', AttributeType: 'S' },
      { AttributeName: 'relationshipId', AttributeType: 'S' },
    ],
  })
}

main().catch((error) => {
  console.error('Failed to set up DynamoDB tables.')
  console.error(error)
  process.exit(1)
})
