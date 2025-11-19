import { z } from "zod";

export const inviteWorkspaceMember = z.object({
    workspaceId: z.string(),
    email: z.string().email({
        message: "Invalid email address",
    }),
    role: z.enum(["member"]).default("member"),
});


