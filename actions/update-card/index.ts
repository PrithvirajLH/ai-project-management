"use server"

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { getCard, updateCard as persistUpdateCard } from "@/lib/cards";
import { getList } from "@/lib/lists";
import { InputType, ReturnType } from "./type";
import { createSafeAction } from "@/lib/create-safe-actions";
import { updateCard as UpdateCardSchema } from "./schema";
import { Action, createAuditLog, EntityType } from "@/lib/create-audit-log";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const { id, boardId, title, description } = data;

  try {
    // Get the card first
    const card = await getCard(id);

    if (!card) {
      return { error: "Card not found" };
    }

    // Get the list that contains this card
    const list = await getList(card.listId);

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

    // Update the card using the lib function
    const updatedCard = await persistUpdateCard({
      cardId: id,
      listId: card.listId,
      title,
      description,
    });

    await createAuditLog({
      entityId: card.id,
      entityType: EntityType.CARD,
      entityTitle: card.title,
      action: Action.UPDATE,
    });

    revalidatePath(`/board/${boardId}`);
    return { data: updatedCard };
  } catch (error) {
    console.error("Failed to update card:", error);
    return { error: "Failed to update card" };
  }
};

export const updateCard = createSafeAction(UpdateCardSchema, handler);
