import { QueryCommand } from '@aws-sdk/lib-dynamodb'

import { dynamoDBDocumentClient, TABLES } from '@/lib/dynamodb'
import type { Relationship } from '@/lib/ripple-engine'

export async function getRelationshipsFromSource(sourceEntityId: string): Promise<Relationship[]> {
  try {
    const response = await dynamoDBDocumentClient.send(
      new QueryCommand({
        TableName: TABLES.relationships,
        KeyConditionExpression: 'sourceEntityId = :sourceEntityId',
        ExpressionAttributeValues: {
          ':sourceEntityId': sourceEntityId,
        },
      }),
    )

    return (response.Items ?? []) as Relationship[]
  } catch (error) {
    if (error instanceof Error && error.name === 'ResourceNotFoundException') {
      throw new Error(
        `DynamoDB table "${TABLES.relationships}" was not found in region "${process.env.AWS_REGION ?? 'us-east-1'}". Run "npm run setup:dynamodb" and then "npm run seed", or update DYNAMODB_RELATIONSHIPS_TABLE to an existing table.`,
        { cause: error },
      )
    }

    throw error
  }
}
