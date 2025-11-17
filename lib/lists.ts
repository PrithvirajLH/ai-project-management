import { randomUUID } from "node:crypto"

import { createTableClient, deleteEntity, listEntities, upsertEntity, getEntity } from "@/lib/azure-tables"
import { deleteCardsByListId, listCards, type Card } from "@/lib/cards"

const LISTS_TABLE = "lists"

type ListEntity = {
  partitionKey: string
  rowKey: string
  title: string
  boardId: string
  order: number
  createdAt: string
  updatedAt: string
}

export type List = {
  id: string
  title: string
  boardId: string
  order: number
  createdAt: Date
  updatedAt: Date
}

export type ListWithCards = List & {
  cards: Card[]
}

function toList(entity: ListEntity): List {
  return {
    id: entity.rowKey,
    title: entity.title,
    boardId: entity.boardId,
    order: entity.order ?? 0,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  }
}

async function ensureListsTable() {
  const client = createTableClient(LISTS_TABLE)
  try {
    await client.createTable()
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 409) {
      throw error
    }
  }
  return client
}

export async function listLists(boardId: string) {
  const client = await ensureListsTable()
  const results = await listEntities<ListEntity>(
    client,
    `PartitionKey eq '${boardId.replace(/'/g, "''")}'`
  )
  return results.map(toList).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function createList({
  boardId,
  title,
  order,
}: {
  boardId: string
  title: string
  order?: number
}) {
  const client = await ensureListsTable()
  const now = new Date().toISOString()
  const rowKey = randomUUID()

  // If order not provided, calculate it as the max order + 1
  let listOrder = order
  if (listOrder === undefined) {
    const existingLists = await listLists(boardId)
    const maxOrder = existingLists.length > 0 
      ? Math.max(...existingLists.map(list => list.order ?? 0))
      : 0
    listOrder = maxOrder + 1
  }

  const entity: ListEntity = {
    partitionKey: boardId,
    rowKey,
    title,
    boardId,
    order: listOrder,
    createdAt: now,
    updatedAt: now,
  }

  await upsertEntity(client, entity)
  return toList(entity)
}

export async function getList(listId: string) {
  const client = await ensureListsTable()
  // Search for list by rowKey across all partitions
  const results = await listEntities<ListEntity>(
    client,
    `RowKey eq '${listId.replace(/'/g, "''")}'`
  )
  if (results.length === 0) {
    return null
  }
  return toList(results[0])
}

export async function getListWithCards(listId: string): Promise<ListWithCards | null> {
  const list = await getList(listId)
  if (!list) {
    return null
  }
  const cards = await listCards(listId)
  return {
    ...list,
    cards,
  }
}

export async function updateList({
  listId,
  boardId,
  title,
  order,
}: {
  listId: string
  boardId: string
  title?: string
  order?: number
}) {
  const client = await ensureListsTable()
  const existing = await getEntity<ListEntity>(client, boardId, listId)
  if (!existing) {
    throw new Error("List not found")
  }

  const entity: ListEntity = {
    ...existing,
    title: title ?? existing.title,
    order: order !== undefined ? order : existing.order ?? 0,
    updatedAt: new Date().toISOString(),
  }

  await upsertEntity(client, entity)
  return toList(entity)
}

export async function deleteList({
  boardId,
  listId,
}: {
  boardId: string
  listId: string
}) {
  const client = await ensureListsTable()
  // Cascade delete: Delete all cards before deleting the list
  await deleteCardsByListId(listId)
  await deleteEntity(client, boardId, listId)
}

export async function deleteListsByBoardId(boardId: string) {
  const client = await ensureListsTable()
  const lists = await listLists(boardId)
  // Delete all lists for this board (cascade delete - cards are deleted via deleteList)
  await Promise.all(
    lists.map((list) => deleteList({ boardId, listId: list.id }))
  )
}

