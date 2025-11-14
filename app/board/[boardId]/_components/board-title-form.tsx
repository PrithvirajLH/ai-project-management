"use client";

import { FormInput } from "@/components/forms/form-input";
import { Button } from "@/components/ui/button";
import { Board } from "@/lib/boards";
import { useRef, useState } from "react";

interface BoardTitleFormProps {
  data: Board;
}

export const BoardTitleForm = ({ data }: BoardTitleFormProps) => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const enableEditing = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const disableEditing = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form ref={formRef} className="flex items-center gap-x-2">
        <FormInput
          ref={inputRef}
          id="title"
          onBlur={disableEditing}
          defaultValue={data.title}
          className="text-lg font-bold px-[7px] py-1 h-7 bg-transparent
                    focus-visible:outline-none focus-visible:ring-transparent border-none"
        />
      </form>
    );
  }

  return (
    <Button
      onClick={enableEditing}
      variant="transparent"
      className="font-bold text-lg h-auto w-auto p-1 px-2"
    >
      {data.title}
    </Button>
  );
};
