"use server"

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { getList } from "@/lib/lists";
import { updateCard } from "@/lib/cards";
import { InputType, ReturnType } from "./type";
import { createSafeAction } from "@/lib/create-safe-actions";
import { updateCardOrder as updateCardOrderSchema } from "./schema";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const { items, boardId } = data;

  try {
    if (items.length === 0) {
      return { error: "No cards provided" };
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

    // Get all unique listIds from items
    const uniqueListIds = [...new Set(items.map(item => item.listId))];
    
    // Verify all lists belong to the board
    const lists = await Promise.all(uniqueListIds.map(listId => getList(listId)));
    
    for (const list of lists) {
      if (!list) {
        return { error: "List not found" };
      }
      if (list.boardId !== boardId) {
        return { error: "Some lists do not belong to the specified board" };
      }
    }

    // Update each card's order based on the items array
    // Each item has its own listId (cards can be reordered within or moved between lists)
    const updatedCards = await Promise.all(
      items.map((item) =>
        updateCard({
          cardId: item.id,
          listId: item.listId,
          order: item.order,
        })
      )
    );

    revalidatePath(`/board/${boardId}`);
    return { data: updatedCards };
  } catch (error) {
    console.error("Failed to update card order:", error);
    return { error: "Failed to update card order" };
  }
};

export const updateCardOrder = createSafeAction(updateCardOrderSchema, handler);
