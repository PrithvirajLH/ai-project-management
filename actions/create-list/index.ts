"use server"

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { listLists, createList as persistList } from "@/lib/lists";
import { InputType, ReturnType } from "./type";
import { createSafeAction } from "@/lib/create-safe-actions";
import { createList as createListSchema } from "./schema";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const { title, boardId } = data;

  try {
    const board = await getBoard(boardId);

    if (!board) {
      return { error: "Board not found" };
    }

    // Check if user has access to the board's workspace
    const membership = await getWorkspaceMembership(session.user.id, board.workspaceId);
    if (!membership) {
      return { error: "Unauthorized" };
    }

    // Get all lists for the board to calculate the next order
    const existingLists = await listLists(boardId);
    const maxOrder = existingLists.length > 0 
      ? Math.max(...existingLists.map(list => list.order ?? 0))
      : -1;
    const newOrder = maxOrder + 1;

    const list = await persistList({
      boardId,
      title,
      order: newOrder,
    });

    revalidatePath(`/board/${boardId}`);
    return { data: list };
  } catch (error) {
    console.error("Failed to create list:", error);
    return { error: "Failed to create list" };
  }
};

export const createList = createSafeAction(createListSchema, handler);
