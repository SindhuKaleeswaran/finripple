import { QueryCommand } from '@aws-sdk/lib-dynamodb'

import { dynamoDBDocumentClient, TABLES } from '@/lib/dynamodb'
import type { Relationship } from '@/lib/ripple-engine'

export async function getRelationshipsFromSource(sourceEntityId: string): Promise<Relationship[]> {
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
}
