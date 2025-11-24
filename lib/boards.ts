import { randomUUID } from "node:crypto"

import { createTableClient, deleteEntity, listEntities, upsertEntity } from "@/lib/azure-tables"
import { deleteListsByBoardId, listLists, type List } from "@/lib/lists"

const BOARDS_TABLE = "boards"

type BoardEntity = {
  partitionKey: string
  rowKey: string
  title: string
  imageId?: string
  imageThumbUrl?: string
  imageFullUrl?: string
  imageUserName?: string
  imageLinkHTML?: string
  assistantThreadId?: string | null
  createdAt: string
  updatedAt: string
}

export type Board = {
  id: string
  workspaceId: string
  title: string
  imageId?: string
  imageThumbUrl?: string
  imageFullUrl?: string
  imageUserName?: string
  imageLinkHTML?: string
  assistantThreadId?: string | null
  createdAt: Date
  updatedAt: Date
}

export type BoardWithLists = Board & {
  lists: List[]
}

function toBoard(entity: BoardEntity): Board {
  return {
    id: entity.rowKey,
    workspaceId: entity.partitionKey,
    title: entity.title,
    imageId: entity.imageId,
    imageThumbUrl: entity.imageThumbUrl,
    imageFullUrl: entity.imageFullUrl,
    imageUserName: entity.imageUserName,
    imageLinkHTML: entity.imageLinkHTML,
    assistantThreadId: entity.assistantThreadId ?? null,
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
  imageId,
  imageThumbUrl,
  imageFullUrl,
  imageUserName,
  imageLinkHTML,
  assistantThreadId,
}: {
  workspaceId: string
  title: string
  imageId?: string
  imageThumbUrl?: string
  imageFullUrl?: string
  imageUserName?: string
  imageLinkHTML?: string
  assistantThreadId?: string | null
}) {
  const client = await ensureBoardsTable()
  const now = new Date().toISOString()
  const rowKey = randomUUID()

  const entity: BoardEntity = {
    partitionKey: workspaceId,
    rowKey,
    title,
    imageId,
    imageThumbUrl,
    imageFullUrl,
    imageUserName,
    imageLinkHTML,
    assistantThreadId: assistantThreadId ?? null,
    createdAt: now,
    updatedAt: now,
  }

  await upsertEntity(client, entity)
  return toBoard(entity)
}

export async function getBoard(boardId: string) {
  const client = await ensureBoardsTable()
  // Search for board by rowKey across all partitions
  const results = await listEntities<BoardEntity>(
    client,
    `RowKey eq '${boardId.replace(/'/g, "''")}'`
  )
  if (results.length === 0) {
    return null
  }
  return toBoard(results[0])
}

export async function getBoardWithLists(boardId: string): Promise<BoardWithLists | null> {
  const board = await getBoard(boardId)
  if (!board) {
    return null
  }
  const lists = await listLists(boardId)
  return {
    ...board,
    lists,
  }
}

export async function deleteBoard({
  workspaceId,
  boardId,
}: {
  workspaceId: string
  boardId: string
}) {
  const client = await ensureBoardsTable()
  // Cascade delete: Delete all lists (and their cards) before deleting the board
  await deleteListsByBoardId(boardId)
  await deleteEntity(client, workspaceId, boardId)
}

export async function updateBoardAssistantThreadId({
  workspaceId,
  boardId,
  assistantThreadId,
}: {
  workspaceId: string
  boardId: string
  assistantThreadId: string | null
}) {
  const client = await ensureBoardsTable()
  try {
    const existing = await client.getEntity<BoardEntity>(workspaceId, boardId)
    existing.assistantThreadId = assistantThreadId ?? null
    existing.updatedAt = new Date().toISOString()
    await upsertEntity(client, existing)
    return toBoard(existing)
  } catch (error) {
    console.error("[updateBoardAssistantThreadId] Failed to update thread id", error)
    throw error
  }
}
