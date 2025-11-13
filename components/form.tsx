"use client";

import { create, type State } from "@/actions/create-board";
import { Button } from "./ui/button";
import { useFormState, useFormStatus } from "react-dom"

interface WorkspaceBoardFormProps {
  workspaceId: string;
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="sm:w-auto" disabled={pending}>
      {pending ? "Creating..." : "Create board"}
    </Button>
  )
}

export function WorkspaceBoardForm({ workspaceId }: WorkspaceBoardFormProps) {
  const initialState: State = { message: null, errors: {} }
  const createWithWorkspace = async (_state: State, formData: FormData) => {
    formData.append("workspaceId", workspaceId)
    return create(_state, formData)
  }
  const [state, dispatch] = useFormState(createWithWorkspace, initialState)

  return (
    <form action={dispatch} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex w-full flex-col space-y-2">
        <input
          id="title"
          name="title"
          required
          placeholder="Enter a board title"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        />
        {state.errors?.title ? (
          <div className="space-y-1">
            {state.errors.title.map((error: string) => (
              <p key={error} className="text-sm text-rose-500">
                {error}
              </p>
            ))}
          </div>
        ) : null}
        {state.message ? <p className="text-sm text-rose-500">{state.message}</p> : null}
      </div>
      <SubmitButton />
    </form>
  );
}