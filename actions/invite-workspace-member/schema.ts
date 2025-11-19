import { z } from "zod";

export const inviteWorkspaceMember = z.object({
    workspaceId: z.string({
        required_error: "Workspace ID is required",
        invalid_type_error: "Workspace ID must be a string",
    }),
    email: z.string({
        required_error: "Email is required",
        invalid_type_error: "Email must be a string",
    }).email({
        message: "Invalid email address",
    }),
    role: z.enum(["member"]).default("member"),
});


