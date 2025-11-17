"use client"

import { Plus, X } from "lucide-react";
import { ListWrapper } from "./list-wrapper";
import { useState, useRef } from "react";
import { useEventListener, useOnClickOutside } from "usehooks-ts";
import { FormInput } from "@/components/forms/form-input";
import { useParams, useRouter } from "next/navigation";
import { FormButton } from "@/components/forms/form-button";
import { Button } from "@/components/ui/button";
import { createList } from "@/actions/create-list";
import { useAction } from "@/hooks/use-action";
import { toast } from "sonner";
export const ListForm = () => {
    const router = useRouter();
    const params = useParams();
    const [isEditing, setIsEditing] = useState(false);


    const formRef = useRef<HTMLFormElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const enableEditing = () => {
        setIsEditing(true);
        setTimeout(() => {
            inputRef.current?.focus();
        });
    };

    const disableEditing = () => {
        setIsEditing(false);
    };

    const {execute, fieldErrors} = useAction(createList, {
        onSuccess: (data) => { 
            toast.success(`List "${data.title}" created successfully`);
            disableEditing();
            router.refresh();
        },
        onError: (error) => {
            toast.error(error);
        },
    });

    const onKeyDown = (e: KeyboardEvent) => {
        if(e.key === "Escape") {
            disableEditing();
        };
    };

    useEventListener("keydown", onKeyDown);
    useOnClickOutside(formRef as React.RefObject<HTMLElement>, disableEditing);

    const onSubmit = (formData: FormData) => {
        const title = formData.get("title") as string;
        const boardId = formData.get("boardId") as string;
        execute({ title, boardId });
    }
    
    if(isEditing) {
        return(
            <ListWrapper>
                <form action={onSubmit} ref={formRef} className="w-full p-3 rounded-md bg-white space-y-4 shadow-md" >
                    <FormInput
                        ref={inputRef}
                        errors={fieldErrors}
                        id="title"
                        className="text-sm px-2 py-1 h-7 font-medium border-transparent hover:border-input focus:border-input transition"
                        placeholder="Enter list title..."
                    />
                    <input
                        hidden
                        value={params.boardId}
                        name="boardId"
                        onChange={() => {}}
                        
                    />
                    <div className="flex items-center gap-x-1">
                        <FormButton>
                            Add list
                        </FormButton>
                        <Button onClick={disableEditing}
                        variant="ghost"
                        size="sm"
                        >
                            <X className="h-5 w-5"/>
                        </Button>

                    </div>
                </form>
            </ListWrapper>
        );
    };

    return (
        <ListWrapper>
            <button onClick={enableEditing} className="w-full rounded-md bg-white/80 hover:bg-white/50 text-sm font-medium p-3 flex items-center transition">
                <Plus className="h-4 w-4 mr-2" />
                Add a list
            </button>
        </ListWrapper>
    )
}