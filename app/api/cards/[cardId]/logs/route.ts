import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCard } from "@/lib/cards";
import { getList } from "@/lib/lists";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { createTableClient, listEntities } from "@/lib/azure-tables";
import { EntityType } from "@/lib/create-audit-log";

const AUDIT_LOGS_TABLE = "auditLogs";

type AuditLogEntity = {
  partitionKey: string;
  rowKey: string;
  action: string;
  entityId: string;
  entityType: string;
  entityTitle: string;
  userId: string;
  userImage?: string | null;
  username: string;
  createdAt: string;
  updatedAt: string;
};

async function ensureAuditLogsTable() {
  const client = createTableClient(AUDIT_LOGS_TABLE);
  try {
    await client.createTable();
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 409) {
      throw error;
    }
  }
  return client;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ cardId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { cardId } = await params;

        if (!cardId) {
            return NextResponse.json({ error: "Card ID is required" }, { status: 400 });
        }

        // Get the card to verify it exists and get workspace access
        const card = await getCard(cardId);

        if (!card) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        // Get the list and board to get workspaceId
        const list = await getList(card.listId);
        if (!list) {
            return NextResponse.json({ error: "List not found" }, { status: 404 });
        }

        const board = await getBoard(list.boardId);
        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        // Check if user has access to the board's workspace
        const membership = await getWorkspaceMembership(session.user.id, board.workspaceId);
        if (!membership) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Query audit logs from Azure Table Storage
        const client = await ensureAuditLogsTable();
        const query = `PartitionKey eq '${board.workspaceId.replace(/'/g, "''")}' and entityId eq '${cardId.replace(/'/g, "''")}' and entityType eq '${EntityType.CARD}'`;
        
        const results = await listEntities<AuditLogEntity>(client, query);

        // Sort by createdAt descending and take 3
        const auditLogs = results
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
            .slice(0, 3);

        return NextResponse.json(auditLogs);
    } catch (error) {
        console.error("Failed to get audit logs:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
