import { z } from "zod";
import { createCard } from "./schema";
import { ActionState } from "@/lib/create-safe-actions";
import { Card } from "@/lib/cards";

export type InputType = z.infer<typeof createCard>;
export type ReturnType = ActionState<InputType, Card>;