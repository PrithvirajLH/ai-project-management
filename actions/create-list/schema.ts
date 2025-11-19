import { z } from "zod";

export const createList = z.object({
    title: z.string().min(3, {
        message: "Title must be at least 3 characters long",
    }),
    boardId: z.string()
});