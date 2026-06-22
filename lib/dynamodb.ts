import { DynamoDBClient, type DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const credentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined

const clientConfig: DynamoDBClientConfig = {
  region: process.env.AWS_REGION ?? 'us-east-1',
  ...(credentials ? { credentials } : {}),
}

export const dynamoDBClient = new DynamoDBClient(clientConfig)

export const dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
})

export const TABLES = {
  entities: process.env.DYNAMODB_ENTITIES_TABLE ?? 'FinRippleEntities',
  relationships: process.env.DYNAMODB_RELATIONSHIPS_TABLE ?? 'FinRippleRelationships',
} as const
