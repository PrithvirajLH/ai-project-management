"use server"

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoard, deleteBoard as deleteBoardEntity } from "@/lib/boards";
import { InputType, ReturnType } from "./type";
import { createSafeAction } from "@/lib/create-safe-actions";
import { DeleteBoard as DeleteBoardSchema } from "./schema";
import { redirect } from "next/navigation";
import { Action, createAuditLog, EntityType } from "@/lib/create-audit-log";

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const { id } = data;

  let workspaceId: string;

  try {
    const board = await getBoard(id);

    if (!board) {
      return { error: "Board not found" };
    }

    workspaceId = board.workspaceId;

    // Create audit log BEFORE deletion (board needs to exist to fetch workspaceId)
    await createAuditLog({
      entityId: board.id,
      entityType: EntityType.BOARD,
      entityTitle: board.title,
      action: Action.DELETE,
    });

    await deleteBoardEntity({
      workspaceId: board.workspaceId,
      boardId: board.id,
    });
    
    revalidatePath(`/workspace/${workspaceId}`);
  } catch (error) {
    // Check if this is a redirect error - don't catch redirect errors
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    console.error("Failed to delete board:", error);
    return { error: "Failed to delete board" };
  }

  // Redirect after successful deletion (outside try-catch so it's not caught)
  redirect(`/workspace/${workspaceId}`);
};

export const deleteBoard = createSafeAction(DeleteBoardSchema, handler);
