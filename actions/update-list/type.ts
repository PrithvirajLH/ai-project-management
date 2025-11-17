import { z } from "zod";
import { List } from "@/lib/lists";
import { updateList } from "./schema";
import { ActionState } from "@/lib/create-safe-actions";

export type InputType = z.infer<typeof updateList>;
export type ReturnType = ActionState<InputType, List>;