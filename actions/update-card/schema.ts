import { z } from "zod";

export const updateCard = z.object({
    boardId: z.string(),
    description: z.optional(z.string().min(3, {
        message: "Description must be at least 3 characters long",
    })),
    title: z.optional(z.string().min(3, {
        message: "Title must be at least 3 characters long",
    })),
    id: z.string()
});