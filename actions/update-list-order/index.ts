"use server"

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { updateList } from "@/lib/lists";
import { InputType, ReturnType } from "./type";
import { createSafeAction } from "@/lib/create-safe-actions";
import { updateListOrder as updateListOrderSchema } from "./schema";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const { items, boardId } = data;

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

    // Update each list's order based on the items array
    const updatedLists = await Promise.all(
      items.map((item) =>
        updateList({
          listId: item.id,
          boardId,
          order: item.order,
        })
      )
    );

    revalidatePath(`/board/${boardId}`);
    return { data: updatedLists };
  } catch (error) {
    console.error("Failed to update list order:", error);
    return { error: "Failed to update list order" };
  }
};

export const updateListOrder = createSafeAction(updateListOrderSchema, handler);
