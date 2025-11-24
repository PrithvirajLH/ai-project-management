import { randomUUID } from "node:crypto"

import { createTableClient, listEntities, upsertEntity } from "@/lib/azure-tables"

const BOARD_ASSISTANT_MESSAGES_TABLE = "boardAssistantMessages"

const MAX_HISTORY_ITEMS = 50

type AllowedRole = "user" | "assistant"

type BoardAssistantMessageEntity = {
  partitionKey: string // threadId
  rowKey: string
  boardId: string
  role: AllowedRole
  content: string
  createdAt: string
}

export type BoardAssistantMessage = {
  id: string
  threadId: string
  boardId: string
  role: AllowedRole
  content: string
  createdAt: Date
}

async function ensureBoardAssistantMessagesTable() {
  const client = createTableClient(BOARD_ASSISTANT_MESSAGES_TABLE)
  try {
    await client.createTable()
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 409) {
      throw error
    }
  }
  return client
}

function generateRowKey() {
  const timestamp = Date.now().toString().padStart(15, "0")
  const randomSuffix = randomUUID().split("-")[0]
  return `${timestamp}-${randomSuffix}`
}

export async function appendBoardAssistantMessage({
  threadId,
  boardId,
  role,
  content,
}: {
  threadId: string
  boardId: string
  role: AllowedRole
  content: string
}) {
  const client = await ensureBoardAssistantMessagesTable()
  const now = new Date().toISOString()

  const entity: BoardAssistantMessageEntity = {
    partitionKey: threadId,
    rowKey: generateRowKey(),
    boardId,
    role,
    content,
    createdAt: now,
  }

  await upsertEntity(client, entity)
}

export async function getBoardAssistantMessages(threadId: string, limit = MAX_HISTORY_ITEMS) {
  const client = await ensureBoardAssistantMessagesTable()
  const results = await listEntities<BoardAssistantMessageEntity>(
    client,
    `PartitionKey eq '${threadId.replace(/'/g, "''")}'`
  )

  const sorted = results.sort((a, b) => a.rowKey.localeCompare(b.rowKey))
  const limited =
    limit > 0 && sorted.length > limit ? sorted.slice(sorted.length - limit) : sorted

  return limited.map<BoardAssistantMessage>((entity) => ({
    id: entity.rowKey,
    threadId: entity.partitionKey,
    boardId: entity.boardId,
    role: entity.role,
    content: entity.content,
    createdAt: new Date(entity.createdAt),
  }))
}

