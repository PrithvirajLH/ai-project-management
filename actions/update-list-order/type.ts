import { z } from "zod";
import { List } from "@/lib/lists";
import { updateListOrder } from "./schema";
import { ActionState } from "@/lib/create-safe-actions";

export type InputType = z.infer<typeof updateListOrder>;
export type ReturnType = ActionState<InputType, List[]>;