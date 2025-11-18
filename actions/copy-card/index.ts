"use server"

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { getList } from "@/lib/lists";
import { getCard, createCard as persistCreateCard, listCards } from "@/lib/cards";
import { InputType, ReturnType } from "./type";
import { createSafeAction } from "@/lib/create-safe-actions";
import { CopyCard as CopyCardSchema } from "./schema";

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

    // Get all cards in the same list to calculate order
    const existingCards = await listCards(originalCard.listId);
    const originalIndex = existingCards.findIndex(card => card.id === id);
    
    // Calculate new order - place it right after the original card
    let newOrder: number | undefined;
    if (originalIndex >= 0 && originalIndex < existingCards.length - 1) {
      // If not the last card, place it after the original
      newOrder = existingCards[originalIndex].order + 1;
    }
    // If it's the last card, let createCard calculate max order + 1 (newOrder stays undefined)

    // Create the new card with "Copy" suffix
    const newCard = await persistCreateCard({
      listId: originalCard.listId,
      title: `${originalCard.title} - Copy`,
      description: originalCard.description,
      order: newOrder,
    });

    revalidatePath(`/board/${boardId}`);
    return { data: newCard };
  } catch (error) {
    console.error("Failed to copy card:", error);
    return { error: "Failed to copy card" };
  }
};

export const copyCard = createSafeAction(CopyCardSchema, handler);
