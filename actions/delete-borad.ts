"use server";
import { revalidatePath } from "next/cache";

import { deleteBoard as removeBoard } from "@/lib/boards";

export async function deleteBoard(id: string, workspaceId: string) {
  await removeBoard({ workspaceId, boardId: id });
  revalidatePath(`/workspace/${workspaceId}`);
}