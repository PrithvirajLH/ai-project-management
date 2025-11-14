import { z } from "zod";
import { Board } from "@/lib/boards";
import { DeleteBoard } from "./schema";
import { ActionState } from "@/lib/create-safe-actions";

export type InputType = z.infer<typeof DeleteBoard>;
export type ReturnType = ActionState<InputType, Board>;