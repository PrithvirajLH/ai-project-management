import { z } from "zod";
import { List } from "@/lib/lists";
import { updateCardOrder } from "./schema";
import { ActionState } from "@/lib/create-safe-actions";
import { Card } from "@/lib/cards";

export type InputType = z.infer<typeof updateCardOrder>;
export type ReturnType = ActionState<InputType, Card[]>;