import { randomUUID } from "node:crypto"

import { createTableClient, deleteEntity, listEntities, upsertEntity } from "@/lib/azure-tables"

const BOARDS_TABLE = "boards"

type BoardEntity = {
  partitionKey: string
  rowKey: string
  title: string
  createdAt: string
  updatedAt: string
}

export type Board = {
  id: string
  workspaceId: string
  title: string
  createdAt: Date
  updatedAt: Date
}

function toBoard(entity: BoardEntity): Board {
  return {
    id: entity.rowKey,
    workspaceId: entity.partitionKey,
    title: entity.title,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  }
}

async function ensureBoardsTable() {
  const client = createTableClient(BOARDS_TABLE)
  try {
    await client.createTable()
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 409) {
      throw error
    }
  }
  return client
}

export async function listBoards(workspaceId: string) {
  const client = await ensureBoardsTable()
  const results = await listEntities<BoardEntity>(
    client,
    `PartitionKey eq '${workspaceId.replace(/'/g, "''")}'`
  )
  return results.map(toBoard).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

export async function createBoard({
  workspaceId,
  title,
}: {
  workspaceId: string
  title: string
}) {
  const client = await ensureBoardsTable()
  const now = new Date().toISOString()
  const rowKey = randomUUID()

  const entity: BoardEntity = {
    partitionKey: workspaceId,
    rowKey,
    title,
    createdAt: now,
    updatedAt: now,
  }

  await upsertEntity(client, entity)
  return toBoard(entity)
}

export async function deleteBoard({
  workspaceId,
  boardId,
}: {
  workspaceId: string
  boardId: string
}) {
  const client = await ensureBoardsTable()
  await deleteEntity(client, workspaceId, boardId)
}
