"use client";

import { FormButton } from "@/components/forms/form-button";
import { FormTextarea } from "@/components/forms/form-textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { useAction } from "@/hooks/use-action";
import { createCard } from "@/actions/create-card";
import { useRef, KeyboardEventHandler, forwardRef } from "react";
import { useParams } from "next/navigation";
import { useOnClickOutside } from "usehooks-ts";
import { useEventListener } from "usehooks-ts";
import { toast } from "sonner";

interface CardFormProps {
    listId: string;
    enableEditing: () => void;
    disableEditing: () => void;
    isEditing: boolean;
}

export const CardForm = forwardRef<HTMLTextAreaElement, CardFormProps>(({ 
    listId, 
    enableEditing, 
    disableEditing, 
    isEditing 
}, ref) => {
    const params = useParams();
    const formRef = useRef<HTMLFormElement>(null);
    const {execute, fieldErrors} = useAction(createCard, {
        onSuccess: (data) => {
            toast.success(`Card ${data.title} created successfully`);
            formRef.current?.reset();
        },
        onError: (error) => {
            toast.error(error);
        },
    });

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
        if (e.key === "Escape") {
            disableEditing();
        }
    };
    
    useOnClickOutside(formRef as React.RefObject<HTMLElement>, disableEditing);
    useEventListener("keydown", onKeyDown);

    const onTextareaKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            formRef.current?.requestSubmit();
        }
    };
    const onSubmit = (formData: FormData) => {
        const title = formData.get("title") as string;
        const listId = formData.get("listId") as string;
        const boardId = params.boardId as string;
        execute({ title, boardId, listId });
    };

    if (isEditing) {
        return (
            <form className="m-1.5 py-1 px-1.5 space-y-3" ref={formRef} action={onSubmit}>
                <FormTextarea
                    id="title"
                    onKeyDown={onTextareaKeyDown}
                    ref={ref}
                    placeholder="Enter a title for this card..."
                    errors={fieldErrors}
                    className="min-h-[60px] resize-none transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
                <input
                    hidden
                    id="listId"
                    name="listId"
                    defaultValue={listId}
                />
                <div className="flex items-center gap-2">
                    <FormButton size="sm" className="transition-all duration-200 hover:scale-105 active:scale-95">
                        Add card
                    </FormButton>
                    <Button onClick={disableEditing} variant="ghost" size="sm" className="h-8 w-8 p-0 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive">
                        <X className="w-4 h-4" />
                    </Button>

                </div>
            </form>
        )
    }
        
    return (
        <div className="pt-2 px-2">
            <Button onClick={enableEditing} className="h-auto w-full justify-start text-muted-foreground text-sm hover:text-foreground transition-all duration-200 group" 
            size="sm" variant="ghost">
                <Plus className="w-4 h-4 mr-1.5 transition-transform duration-200 group-hover:scale-110" />
                <span>Add a card</span>
            </Button>
        </div>
    )})

CardForm.displayName = "CardForm";