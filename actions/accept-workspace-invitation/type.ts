import { z } from "zod";
import { WorkspaceInvitation } from "@/lib/workspaces";
import { acceptWorkspaceInvitation } from "./schema";
import { ActionState } from "@/lib/create-safe-actions";

export type InputType = z.infer<typeof acceptWorkspaceInvitation>;
export type ReturnType = ActionState<InputType, WorkspaceInvitation>;


