import { TableClient, type TableEntityResult } from "@azure/data-tables"

const connectionString = process.env.AZURE_TABLES_CONNECTION_STRING ?? null

export function createTableClient(tableName: string) {
  if (!connectionString) {
    throw new Error("Missing AZURE_TABLES_CONNECTION_STRING")
  }

  return TableClient.fromConnectionString(connectionString, tableName)
}

export async function upsertEntity<T extends object>(
  client: TableClient,
  entity: T & { partitionKey: string; rowKey: string }
) {
  await client.upsertEntity(entity, "Replace")
}

export async function getEntity<T extends object>(
  client: TableClient,
  partitionKey: string,
  rowKey: string
) {
  try {
    const result = await client.getEntity<T>(partitionKey, rowKey)
    return result
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) {
      return null
    }
    throw error
  }
}

export async function listEntities<T extends object>(
  client: TableClient,
  query: string
): Promise<Array<TableEntityResult<T>>> {
  const results: Array<TableEntityResult<T>> = []
  for await (const entity of client.listEntities<T>({ queryOptions: { filter: query } })) {
    results.push(entity)
  }
  return results
}

export async function deleteEntity(
  client: TableClient,
  partitionKey: string,
  rowKey: string
) {
  await client.deleteEntity(partitionKey, rowKey)
}


