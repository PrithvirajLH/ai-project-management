import { randomUUID } from "node:crypto"

import { createTableClient, listEntities, upsertEntity } from "@/lib/azure-tables"

const WORKFLOWS_TABLE = "workflows"

type WorkflowEntity = {
  partitionKey: string
  rowKey: string
  name: string
  createdAt: string
  updatedAt: string
}

export type Workflow = {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

async function ensureTable() {
  const client = createTableClient(WORKFLOWS_TABLE)
  try {
    await client.createTable()
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 409) {
      throw error
    }
  }
  return client
}

function toWorkflow(entity: WorkflowEntity): Workflow {
  return {
    id: entity.rowKey,
    name: entity.name,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  }
}

export async function listWorkflows(workspaceId: string) {
  const client = await ensureTable()
  const results = await listEntities<WorkflowEntity>(
    client,
    `PartitionKey eq '${workspaceId.replace(/'/g, "''")}'`
  )
  return results.map(toWorkflow).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

export async function createWorkflow({
  workspaceId,
  name,
}: {
  workspaceId: string
  name: string
}) {
  const client = await ensureTable()
  const now = new Date().toISOString()
  const rowKey = randomUUID()

  const entity: WorkflowEntity = {
    partitionKey: workspaceId,
    rowKey,
    name,
    createdAt: now,
    updatedAt: now,
  }

  await upsertEntity(client, entity)
  return toWorkflow(entity)
}


