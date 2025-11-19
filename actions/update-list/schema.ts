import { z } from "zod";

export const updateList = z.object({
    title: z.string().min(3, {
        message: "Title must be at least 3 characters long",
    }),
    id: z.string(),
    boardId: z.string(),
});