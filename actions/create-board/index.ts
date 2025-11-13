"use server";

import { revalidatePath } from "next/cache";
import { InputType, ReturnType } from "./types";
import { createSafeAction } from "@/lib/create-safe-actions";
import { CreateBoard } from "./schema";
import { createBoard as persistBoard } from "@/lib/boards";

const handler = async (data: InputType): Promise<ReturnType> => {
  const { workspaceId, title } = data;

  try {
    const board = await persistBoard({ workspaceId, title });
    revalidatePath(`/workspace/${workspaceId}`);
    return { data: board };
  } catch {
    return { error: "Failed to create board" };
  }
};

export const createBoard = createSafeAction(CreateBoard, handler);