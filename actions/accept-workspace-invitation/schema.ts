import { z } from "zod";

export const acceptWorkspaceInvitation = z.object({
    token: z.string(),
});


