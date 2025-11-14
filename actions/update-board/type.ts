import { z } from "zod";
import { Board } from "@/lib/boards";
import { updateBoard } from "./schema";
import { ActionState } from "@/lib/create-safe-actions";

export type InputType = z.infer<typeof updateBoard>;
export type ReturnType = ActionState<InputType, Board>;