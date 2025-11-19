import { z } from "zod";

export const CreateBoard = z.object({
    title: z.string().min(3, {
        message: "Title must be at least 3 characters",
    }),
    workspaceId: z.string().min(1, { message: "Workspace is required" }),
    image: z.string().min(1, { message: "Image is required" }),
})
