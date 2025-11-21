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
                <form action={onSubmit} ref={formRef} className="w-full p-3.5 rounded-lg bg-white space-y-3 shadow-md shadow-black/5 border border-border/40 hover:border-border/60 transition-all duration-200" >
                    <FormInput
                        ref={inputRef}
                        errors={fieldErrors}
                        id="title"
                        className="text-sm px-2.5 py-2 h-8 font-medium border-transparent hover:border-input focus:border-input transition"
                        placeholder="Enter list title..."
                    />
                    <input
                        hidden
                        value={params.boardId}
                        name="boardId"
                        onChange={() => {}}
                        
                    />
                    <div className="flex items-center gap-2">
                        <FormButton>
                            Add list
                        </FormButton>
                        <Button onClick={disableEditing}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        >
                            <X className="h-4 w-4"/>
                        </Button>

                    </div>
                </form>
            </ListWrapper>
        );
    };

    return (
        <ListWrapper>
            <button onClick={enableEditing} className="w-full rounded-lg bg-white/90 hover:bg-white text-sm font-medium p-3 flex items-center gap-2 transition-all duration-200 hover:shadow-sm hover:shadow-black/5 border border-dashed border-border/60 hover:border-border hover:border-solid cursor-pointer group">
                <Plus className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                <span className="transition-colors duration-200">Add a list</span>
            </button>
        </ListWrapper>
    )
}