import { randomUUID } from "node:crypto"

import { createTableClient, deleteEntity, listEntities, upsertEntity } from "@/lib/azure-tables"
import { deleteListsByBoardId, listLists, type List } from "@/lib/lists"
import { listCards } from "@/lib/cards"

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

export type BoardWithTodoCount = Board & {
  todoCount: number
}

/**
 * Checks if a list title matches common "To-Do" patterns
 */
function isTodoList(listTitle: string): boolean {
  const normalized = listTitle.toLowerCase().trim()
  const todoPatterns = [
    "to-do",
    "to do",
    "todo",
    "to_do",
    "tasks",
    "pending",
    "backlog",
    "open",
  ]
  return todoPatterns.some((pattern) => normalized.includes(pattern))
}

/**
 * Counts the number of todo cards in a board.
 * A todo card is defined as a card in a list with a title matching common "To-Do" patterns.
 */
export async function countTodosForBoard(boardId: string): Promise<number> {
  const lists = await listLists(boardId)
  let todoCount = 0

  for (const list of lists) {
    if (isTodoList(list.title)) {
      const cards = await listCards(list.id)
      todoCount += cards.length
    }
  }

  return todoCount
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

/**
 * Lists boards with their todo counts included.
 * This is useful for displaying boards prioritized by outstanding todos.
 */
export async function listBoardsWithTodoCounts(workspaceId: string): Promise<BoardWithTodoCount[]> {
  const boards = await listBoards(workspaceId)
  const boardsWithCounts = await Promise.all(
    boards.map(async (board) => {
      const todoCount = await countTodosForBoard(board.id)
      return {
        ...board,
        todoCount,
      }
    })
  )
  return boardsWithCounts
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
