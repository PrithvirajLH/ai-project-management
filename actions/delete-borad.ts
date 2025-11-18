"use server";
import { revalidatePath } from "next/cache";

import { deleteBoard as removeBoard } from "@/lib/boards";
import { Action, createAuditLog, EntityType } from "@/lib/create-audit-log";

export async function deleteBoard(id: string, workspaceId: string) {
  await removeBoard({ workspaceId, boardId: id });
  // await createAuditLog({
  //   entityId: id,
  //   entityType: EntityType.BOARD,
  //   entityTitle: boardTitle ?? "Unknown Board",
  //   action: Action.DELETE,
  // });
  revalidatePath(`/workspace/${workspaceId}`);
}