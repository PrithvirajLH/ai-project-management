import { z } from "zod";
import { Board } from "@/lib/boards";
import { CreateBoard } from "./schema";
import { ActionState } from "@/lib/create-safe-actions";

export type InputType = z.infer<typeof CreateBoard>;
export type ReturnType = ActionState<InputType, Board>;