"use server"

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { getList } from "@/lib/lists";
import { listCards, createCard as persistCreateCard } from "@/lib/cards";
import { InputType, ReturnType } from "./type";
import { createSafeAction } from "@/lib/create-safe-actions";
import { createCard as createCardSchema } from "./schema";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const { title, boardId, listId } = data;

  try {
    // Verify the list exists
    const list = await getList(listId);

    if (!list) {
      return { error: "List not found" };
    }

    // Verify the list belongs to the provided boardId
    if (list.boardId !== boardId) {
      return { error: "List does not belong to the specified board" };
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

    // Get all cards for the list to calculate the next order
    const existingCards = await listCards(listId);
    const lastCard = existingCards.length > 0 
      ? existingCards[existingCards.length - 1] // Get the last card (already sorted by order)
      : null;
    const newOrder = lastCard ? lastCard.order + 1 : 1; // Start at 1

    const card = await persistCreateCard({
      listId,
      title,
      order: newOrder,
    });

    revalidatePath(`/board/${boardId}`);
    return { data: card };
  } catch (error) {
    console.error("Failed to create card:", error);
    return { error: "Failed to create card" };
  }
};

export const createCard = createSafeAction(createCardSchema, handler);
