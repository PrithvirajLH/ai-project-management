"use server"

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { InputType, ReturnType } from "./type";
import { createSafeAction } from "@/lib/create-safe-actions";
import { DeleteList as DeleteListSchema } from "./schema";
import { getList, deleteList as deleteListEntity } from "@/lib/lists";
import { createAuditLog } from "@/lib/create-audit-log";
import { Action, EntityType } from "@/lib/create-audit-log";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const { id, boardId } = data;

  try {
    const list = await getList(id);

    if (!list) {
      return { error: "List not found" };
    }

    // Verify the list belongs to the provided boardId
    if (list.boardId !== boardId) {
      return { error: "List does not belong to the specified board" };
    }

    // Get the board to check workspace access
    const board = await getBoard(list.boardId);

    if (!board) {
      return { error: "Board not found" };
    }

    // Check if user has access to the board's workspace
    const membership = await getWorkspaceMembership(session.user.id, board.workspaceId);
    if (!membership) {
      return { error: "Unauthorized" };
    }

    // Create audit log BEFORE deletion (list needs to exist to fetch workspaceId)
    await createAuditLog({
      entityId: list.id,
      entityType: EntityType.LIST,
      entityTitle: list.title,
      action: Action.DELETE,
    });

    await deleteListEntity({
      boardId: list.boardId,
      listId: list.id,
    });

    revalidatePath(`/board/${list.boardId}`);
    return { data: list };
  } catch (error) {
    console.error("Failed to delete list:", error);
    return { error: "Failed to delete list" };
  }
};

export const deleteList = createSafeAction(DeleteListSchema, handler);
