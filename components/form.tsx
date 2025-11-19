"use client";

import { createBoard } from "@/actions/create-board";
import { useAction } from "@/hooks/use-action";
import { useState } from "react";
import { FormInput } from "@/components/forms/form-input";
import { FormButton } from "@/components/forms/form-button";
import { FormPicker } from "@/components/forms/form-picker";
import { XCircle } from "lucide-react";

interface WorkspaceBoardFormProps {
  workspaceId: string;
}

export function WorkspaceBoardForm({ workspaceId }: WorkspaceBoardFormProps) {
  const { execute, fieldErrors } = useAction(createBoard, {})
  const [clientError, setClientError] = useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const title = (formData.get("title") as string)?.trim() ?? ""
    const image = (formData.get("image") as string)?.trim() ?? ""

    if (title.length < 3) {
      setClientError("Title must be at least 3 characters")
      return
    }

    if (!image) {
      setClientError("Please select an image")
      return
    }

    setClientError(null)

    await execute({
      title,
      workspaceId,
      image,
    })

    if (form) {
      form.reset()
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="flex w-full flex-col space-y-2">
        <FormPicker
          id="image"
          errors={fieldErrors}
        />
        <FormInput
          label="Board Title"
          id="title"
          name="title"
          placeholder="Enter a board title"
          required
          errors={fieldErrors}
        />
        {clientError ? (
          <div className="mt-2 text-xs text-rose-500">
            <div className="flex items-center gap-2 rounded-sm border border-rose-500 bg-rose-500/10 p-2 font-medium">
              <XCircle className="h-4 w-4" />
              {clientError}
            </div>
          </div>
        ) : null}
      </div>
      <FormButton>
        Save
      </FormButton>
    </form>
  );
}