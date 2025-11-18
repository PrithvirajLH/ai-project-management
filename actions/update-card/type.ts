import { z } from "zod";
import { updateCard } from "./schema";
import { ActionState } from "@/lib/create-safe-actions";
import { Card } from "@/lib/cards";

export type InputType = z.infer<typeof updateCard>;
export type ReturnType = ActionState<InputType, Card>;