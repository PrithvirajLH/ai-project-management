"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createBoard } from "@/lib/boards";
import { redirect } from "next/navigation";

export type State = {
    errors?: {
        title?: string[];
    },
    message?: string | null;
}

const createBoardSchema = z.object({
  title: z.string().min(3, {message: "Minimum 3 characters"}),
  workspaceId: z.string().min(1, "Workspace is required"),
});

export async function create(prevState: State, formData: FormData) {
  const validatedFields = createBoardSchema.safeParse({
    title: formData.get("title"),
    workspaceId: formData.get("workspaceId"),
  });

  if (!validatedFields.success) {
    return {
        errors: validatedFields.error.flatten().fieldErrors,
        
    };
  }

  const { title, workspaceId } = validatedFields.data;

  try {
    await createBoard({ workspaceId, title });
  } catch {
    return{
        message: "Database Error: Failed to create board.",
    }
}
  revalidatePath(`/workspace/${workspaceId}`);
  redirect(`/workspace/${workspaceId}`);
}