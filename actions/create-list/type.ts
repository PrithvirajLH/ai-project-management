import { z } from "zod";
import { List } from "@/lib/lists";
import { createList } from "./schema";
import { ActionState } from "@/lib/create-safe-actions";

export type InputType = z.infer<typeof createList>;
export type ReturnType = ActionState<InputType, List>;