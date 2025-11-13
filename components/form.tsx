"use client";

import { createBoard } from "@/actions/create-board";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { useState } from "react";
import { FormInput } from "@/components/forms/form-input";
import { FormButton } from "@/components/forms/form-button";

interface WorkspaceBoardFormProps {
  workspaceId: string;
}

export function WorkspaceBoardForm({ workspaceId }: WorkspaceBoardFormProps) {
  const { execute, fieldErrors, isLoading } = useAction(createBoard, {})
  const [clientError, setClientError] = useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const title = (formData.get("title") as string)?.trim() ?? ""

    if (title.length < 3) {
      setClientError("Title must be at least 3 characters")
      return
    }

    setClientError(null)

    await execute({
      title,
      workspaceId,
    })

    if (form) {
      form.reset()
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="flex w-full flex-col space-y-2">
        <FormInput
          label="Board Title"
          id="title"
          name="title"
          placeholder="Enter a board title"
          required
          errors={fieldErrors}
        />
        {clientError ? <p className="text-sm text-rose-500">{clientError}</p> : null}
      </div>
      <FormButton>
        Save
      </FormButton>
    </form>
  );
}