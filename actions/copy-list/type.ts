import { z } from "zod";
import { List } from "@/lib/lists";
import { CopyList } from "./schema";
import { ActionState } from "@/lib/create-safe-actions";

export type InputType = z.infer<typeof CopyList>;
export type ReturnType = ActionState<InputType, List>;