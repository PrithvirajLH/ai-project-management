import { z } from "zod";

export const CreateBoard = z.object({
    title: z.string({
        required_error: "Title is required",
        invalid_type_error: "Title must be a string",
    }).min(3, {
        message: "Title must be at least 3 characters",
    }),
    workspaceId: z.string({
        required_error: "Workspace is required",
        invalid_type_error: "Workspace must be a string",
    }).min(1, { message: "Workspace is required" }),
    image: z.string({
        required_error: "Image is required",
        invalid_type_error: "Image must be a string",
    }).min(1, { message: "Image is required" }),
})
