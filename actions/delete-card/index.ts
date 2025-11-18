"use server"

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { getList } from "@/lib/lists";
import { getCard, deleteCard as persistDeleteCard } from "@/lib/cards";
import { InputType, ReturnType } from "./type";
import { createSafeAction } from "@/lib/create-safe-actions";
import { DeleteCard as DeleteCardSchema } from "./schema";
import { Action, createAuditLog, EntityType } from "@/lib/create-audit-log";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const { id, boardId } = data;

  try {
    // Get the original card
    const originalCard = await getCard(id);

    if (!originalCard) {
      return { error: "Card not found" };
    }

    // Get the list that contains this card
    const list = await getList(originalCard.listId);

    if (!list) {
      return { error: "List not found" };
    }

    // Verify the list belongs to the provided boardId
    if (list.boardId !== boardId) {
      return { error: "Card does not belong to the specified board" };
    }

    // Get the board to check workspace access
    const board = await getBoard(boardId);

    if (!board) {
      return { error: "Board not found" };
    }

    // Check if user has access to the board's workspace
    const membership = await getWorkspaceMembership(session.user.id, board.workspaceId);
    if (!membership) {
      return { error: "Unauthorized" };
    }

    // Create audit log BEFORE deletion (card needs to exist to fetch workspaceId)
    await createAuditLog({
      entityId: originalCard.id,
      entityType: EntityType.CARD,
      entityTitle: originalCard.title,
      action: Action.DELETE,
    });

    // Delete the card
    await persistDeleteCard({ listId: originalCard.listId, cardId: originalCard.id });

    revalidatePath(`/board/${boardId}`);
    return { data: originalCard };
  } catch (error) {
    console.error("Failed to delete card:", error);
    return { error: "Failed to delete card" };
  }
};

export const deleteCard = createSafeAction(DeleteCardSchema, handler);
