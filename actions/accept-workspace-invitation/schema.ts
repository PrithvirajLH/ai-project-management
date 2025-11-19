import { z } from "zod";

export const acceptWorkspaceInvitation = z.object({
    token: z.string({
        required_error: "Invitation token is required",
        invalid_type_error: "Invitation token must be a string",
    }),
});


