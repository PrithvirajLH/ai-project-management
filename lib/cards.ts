import { randomUUID } from "node:crypto"

import { createTableClient, deleteEntity, listEntities, upsertEntity, getEntity } from "@/lib/azure-tables"

const CARDS_TABLE = "cards"

type CardEntity = {
  partitionKey: string
  rowKey: string
  title: string
  description?: string
  listId: string
  order: number
  createdAt: string
  updatedAt: string
}

export type Card = {
  id: string
  title: string
  description?: string
  listId: string
  order: number
  createdAt: Date
  updatedAt: Date
}

function toCard(entity: CardEntity): Card {
  return {
    id: entity.rowKey,
    title: entity.title,
    description: entity.description,
    listId: entity.listId,
    order: entity.order ?? 0,
    createdAt: new Date(entity.createdAt),
    updatedAt: new Date(entity.updatedAt),
  }
}

async function ensureCardsTable() {
  const client = createTableClient(CARDS_TABLE)
  try {
    await client.createTable()
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 409) {
      throw error
    }
  }
  return client
}

export async function listCards(listId: string) {
  const client = await ensureCardsTable()
  const results = await listEntities<CardEntity>(
    client,
    `PartitionKey eq '${listId.replace(/'/g, "''")}'`
  )
  return results.map(toCard).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function createCard({
  listId,
  title,
  description,
  order,
}: {
  listId: string
  title: string
  description?: string
  order?: number
}) {
  const client = await ensureCardsTable()
  const now = new Date().toISOString()
  const rowKey = randomUUID()

  // If order not provided, calculate it as the max order + 1
  let cardOrder = order
  if (cardOrder === undefined) {
    const existingCards = await listCards(listId)
    const maxOrder = existingCards.length > 0 
      ? Math.max(...existingCards.map(card => card.order ?? 0))
      : 0
    cardOrder = maxOrder + 1
  }

  const entity: CardEntity = {
    partitionKey: listId,
    rowKey,
    title,
    description,
    listId,
    order: cardOrder,
    createdAt: now,
    updatedAt: now,
  }

  await upsertEntity(client, entity)
  return toCard(entity)
}

export async function getCard(cardId: string) {
  const client = await ensureCardsTable()
  // Search for card by rowKey across all partitions
  const results = await listEntities<CardEntity>(
    client,
    `RowKey eq '${cardId.replace(/'/g, "''")}'`
  )
  if (results.length === 0) {
    return null
  }
  return toCard(results[0])
}

export async function updateCard({
  cardId,
  listId,
  title,
  description,
  order,
}: {
  cardId: string
  listId: string
  title?: string
  description?: string | null
  order?: number
}) {
  const client = await ensureCardsTable()
  
  // First, find the card in its current partition (it might be in a different list)
  const currentCard = await getCard(cardId)
  if (!currentCard) {
    throw new Error("Card not found")
  }

  const oldListId = currentCard.listId
  const isMovingList = oldListId !== listId

  const now = new Date().toISOString()

  // If moving to a different list, delete from old partition and create in new partition
  if (isMovingList) {
    // Delete from old partition
    await deleteEntity(client, oldListId, cardId)
    
    // Create in new partition with updated data
    const newEntity: CardEntity = {
      partitionKey: listId,
      rowKey: cardId,
      title: title ?? currentCard.title,
      description: description !== undefined ? description ?? undefined : currentCard.description,
      listId,
      order: order !== undefined ? order : currentCard.order ?? 0,
      createdAt: currentCard.createdAt.toISOString(),
      updatedAt: now,
    }
    
    await upsertEntity(client, newEntity)
    return toCard(newEntity)
  }

  // If staying in the same list, just update normally
  const existing = await getEntity<CardEntity>(client, listId, cardId)
  if (!existing) {
    throw new Error("Card not found")
  }

  const entity: CardEntity = {
    ...existing,
    title: title ?? existing.title,
    description: description !== undefined ? description ?? undefined : existing.description,
    order: order !== undefined ? order : existing.order ?? 0,
    updatedAt: now,
  }

  await upsertEntity(client, entity)
  return toCard(entity)
}

export async function deleteCard({
  listId,
  cardId,
}: {
  listId: string
  cardId: string
}) {
  const client = await ensureCardsTable()
  await deleteEntity(client, listId, cardId)
}

export async function deleteCardsByListId(listId: string) {
  const client = await ensureCardsTable()
  const cards = await listCards(listId)
  // Delete all cards for this list (cascade delete)
  await Promise.all(
    cards.map((card) => deleteEntity(client, listId, card.id))
  )
}

