import { z } from "zod";
import { WorkspaceInvitation } from "@/lib/workspaces";
import { inviteWorkspaceMember } from "./schema";
import { ActionState } from "@/lib/create-safe-actions";

export type InputType = z.infer<typeof inviteWorkspaceMember>;
export type ReturnType = ActionState<InputType, WorkspaceInvitation>;


