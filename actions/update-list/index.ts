"use server"

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { getList, updateList as persistUpdateList } from "@/lib/lists";
import { InputType, ReturnType } from "./type";
import { createSafeAction } from "@/lib/create-safe-actions";
import { updateList as UpdateListSchema } from "./schema";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const { id, title, boardId } = data;

  try {
    const list = await getList(id);

    if (!list) {
      return { error: "List not found" };
    }

    // Verify the list belongs to the provided boardId
    if (list.boardId !== boardId) {
      return { error: "List does not belong to the specified board" };
    }

    // Get the board to check workspace access (use list.boardId which matches data.boardId after verification)
    const board = await getBoard(list.boardId);

    if (!board) {
      return { error: "Board not found" };
    }

    // Check if user has access to the board's workspace
    const membership = await getWorkspaceMembership(session.user.id, board.workspaceId);
    if (!membership) {
      return { error: "Unauthorized" };
    }

    const updatedList = await persistUpdateList({
      listId: id,
      boardId,
      title,
    });

    revalidatePath(`/board/${list.boardId}`);
    return { data: updatedList };
  } catch (error) {
    console.error("Failed to update list:", error);
    return { error: "Failed to update list" };
  }
};

export const updateList = createSafeAction(UpdateListSchema, handler);
