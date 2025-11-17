"use server"

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { InputType, ReturnType } from "./type";
import { createSafeAction } from "@/lib/create-safe-actions";
import { CopyList as CopyListSchema } from "./schema";
import { getListWithCards, createList as persistCreateList, listLists } from "@/lib/lists";
import { createCard } from "@/lib/cards";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const { id, boardId } = data;

  try {
    // Get the original list with its cards
    const originalList = await getListWithCards(id);

    if (!originalList) {
      return { error: "List not found" };
    }

    // Verify the list belongs to the provided boardId
    if (originalList.boardId !== boardId) {
      return { error: "List does not belong to the specified board" };
    }

    // Get the board to check workspace access
    const board = await getBoard(originalList.boardId);

    if (!board) {
      return { error: "Board not found" };
    }

    // Check if user has access to the board's workspace
    const membership = await getWorkspaceMembership(session.user.id, board.workspaceId);
    if (!membership) {
      return { error: "Unauthorized" };
    }

    // Calculate the order for the new list (right after the original list)
    const existingLists = await listLists(boardId);
    const originalIndex = existingLists.findIndex(list => list.id === id);
    const newOrder = originalIndex >= 0 && originalIndex < existingLists.length - 1
      ? existingLists[originalIndex].order + 1
      : undefined; // If it's the last list, let createList calculate the max order + 1

    // Create the new list with "Copy of" prefix
    const newList = await persistCreateList({
      boardId: originalList.boardId,
      title: `${originalList.title} - Copy`,
      order: newOrder,
    });

    // Copy all cards from the original list to the new list, preserving order
    await Promise.all(
      originalList.cards.map((card, index) =>
        createCard({
          listId: newList.id,
          title: card.title,
          description: card.description,
          order: index + 1, // Start at 1 for consistency
        })
      )
    );

    revalidatePath(`/board/${boardId}`);
    return { data: newList };
  } catch (error) {
    console.error("Failed to copy list:", error);
    return { error: "Failed to copy list" };
  }
};

export const copyList = createSafeAction(CopyListSchema, handler);
