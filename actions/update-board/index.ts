"use server"

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoard } from "@/lib/boards";
import { upsertEntity } from "@/lib/azure-tables";
import { createTableClient } from "@/lib/azure-tables";
import { InputType, ReturnType } from "./type";
import { createSafeAction } from "@/lib/create-safe-actions";
import { updateBoard as UpdateBoardSchema } from "./schema";

const BOARDS_TABLE = "boards";

async function ensureBoardsTable() {
  const client = createTableClient(BOARDS_TABLE);
  try {
    await client.createTable();
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 409) {
      throw error;
    }
  }
  return client;
}

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const { id, title } = data;

  try {
    const board = await getBoard(id);

    if (!board) {
      return { error: "Board not found" };
    }

    const client = await ensureBoardsTable();
    const now = new Date().toISOString();

    await upsertEntity(client, {
      partitionKey: board.workspaceId,
      rowKey: board.id,
      title,
      imageId: board.imageId,
      imageThumbUrl: board.imageThumbUrl,
      imageFullUrl: board.imageFullUrl,
      imageUserName: board.imageUserName,
      imageLinkHTML: board.imageLinkHTML,
      createdAt: board.createdAt.toISOString(),
      updatedAt: now,
    });

    const updatedBoard = {
      ...board,
      title,
      updatedAt: new Date(now),
    };

    revalidatePath(`/board/${board.id}`);
    return { data: updatedBoard };
  } catch (error) {
    console.error("Failed to update board:", error);
    return { error: "Failed to update board" };
  }
};

export const updateBoard = createSafeAction(UpdateBoardSchema, handler);
