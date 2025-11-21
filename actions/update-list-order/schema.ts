import { z } from "zod";

export const updateListOrder = z.object({
    items: z.array(z.object({
        id: z.string(),
        order: z.number(),
    })),
    boardId: z.string(),
});