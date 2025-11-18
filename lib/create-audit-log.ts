import { randomUUID } from "node:crypto"
import { getServerSession } from "next-auth"
import { createTableClient, upsertEntity, listEntities } from "@/lib/azure-tables"
import { getBoard } from "@/lib/boards"
import { getList } from "@/lib/lists"
import { getCard } from "@/lib/cards"
import type { AuditLog } from "@/types"

const AUDIT_LOGS_TABLE = "auditLogs"

export enum Action {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

export enum EntityType {
  BOARD = "BOARD",
  LIST = "LIST",
  CARD = "CARD",
}

type AuditLogEntity = {
  partitionKey: string // workspaceId
  rowKey: string // UUID
  action: Action
  entityId: string
  entityType: EntityType
  entityTitle: string
  userId: string
  userImage?: string | null
  username: string
  createdAt: string
  updatedAt: string
}

async function ensureAuditLogsTable() {
  const client = createTableClient(AUDIT_LOGS_TABLE)
  try {
    await client.createTable()
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 409) {
      throw error
    }
  }
  return client
}

interface Props {
  entityId: string
  entityType: EntityType
  entityTitle: string
  action: Action
}

export const createAuditLog = async (props: Props) => {
  try {
    const { entityId, entityType, entityTitle, action } = props

    // Get session for user info - import authOptions dynamically to avoid client-side evaluation
    const { authOptions } = await import("@/lib/auth")
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("User not authenticated")
    }

    // Get workspaceId based on entityType
    let workspaceId: string

    if (entityType === EntityType.BOARD) {
      const board = await getBoard(entityId)
      if (!board) {
        throw new Error("Board not found")
      }
      workspaceId = board.workspaceId
    } else if (entityType === EntityType.LIST) {
      const list = await getList(entityId)
      if (!list) {
        throw new Error("List not found")
      }
      const board = await getBoard(list.boardId)
      if (!board) {
        throw new Error("Board not found")
      }
      workspaceId = board.workspaceId
    } else if (entityType === EntityType.CARD) {
      const card = await getCard(entityId)
      if (!card) {
        throw new Error("Card not found")
      }
      const list = await getList(card.listId)
      if (!list) {
        throw new Error("List not found")
      }
      const board = await getBoard(list.boardId)
      if (!board) {
        throw new Error("Board not found")
      }
      workspaceId = board.workspaceId
    } else {
      throw new Error("Invalid entity type")
    }

    // Create audit log entity
    const client = await ensureAuditLogsTable()
    const now = new Date().toISOString()
    const rowKey = randomUUID()

    const entity: AuditLogEntity = {
      partitionKey: workspaceId,
      rowKey,
      action,
      entityId,
      entityType,
      entityTitle,
      userId: session.user.id,
      userImage: session.user.image ?? null,
      username: session.user.name ?? "Unknown User",
      createdAt: now,
      updatedAt: now,
    }

    await upsertEntity(client, entity)
  } catch (error) {
    console.log("[AUDIT_LOG_ERROR]", error)
    // Don't throw - audit logs should not break the main operation
  }
}

export async function listAuditLogs(workspaceId: string): Promise<AuditLog[]> {
  try {
    const client = await ensureAuditLogsTable()
    const query = `PartitionKey eq '${workspaceId.replace(/'/g, "''")}'`
    
    const results = await listEntities<AuditLogEntity>(client, query)

    // Transform and sort by createdAt descending
    const auditLogs: AuditLog[] = results
      .map((entity) => ({
        id: entity.rowKey,
        workspaceId: entity.partitionKey,
        action: entity.action,
        entityId: entity.entityId,
        entityType: entity.entityType,
        entityTitle: entity.entityTitle,
        userId: entity.userId,
        userImage: entity.userImage ?? null,
        username: entity.username,
        createdAt: new Date(entity.createdAt),
        updatedAt: new Date(entity.updatedAt),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return auditLogs
  } catch (error) {
    console.error("[AUDIT_LOG_ERROR] Failed to list audit logs:", error)
    return []
  }
}
