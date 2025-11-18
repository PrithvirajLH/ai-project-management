"use client";

import { CardWithList } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AlignLeft } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEventListener, useOnClickOutside } from "usehooks-ts";
import { FormTextarea } from "@/components/forms/form-textarea";
import { FormButton } from "@/components/forms/form-button";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { updateCard } from "@/actions/update-card";
import { useAction } from "@/hooks/use-action";
import { toast } from "sonner";

interface DescriptionProps {
    data: CardWithList;
}

export const Description = ({
    data,
}: DescriptionProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [description, setDescription] = useState(data.description || "");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const formRef = useRef<HTMLFormElement>(null); 
    const queryClient = useQueryClient();   
    const params = useParams();
    
    const {execute, fieldErrors} = useAction(updateCard, {
        onSuccess: (updatedCard) => {
            queryClient.invalidateQueries({
                queryKey: ["card", updatedCard.id],
            });
            queryClient.invalidateQueries({
                queryKey: ["audit-logs", updatedCard.id],
            });
            setDescription(updatedCard.description || "");
            disableEditing();
            toast.success("Description updated successfully");
        },
        onError: (error) => {
            toast.error(error);
        },
    });

    // Sync description state when data.description changes (e.g., after refetch)
    useEffect(() => {
        setDescription(data.description || "");
    }, [data.description]);
    
    const enableEditing = () => {
        setIsEditing(true);
        setTimeout(() => {
            textareaRef.current?.focus();
        });
    }
    
    const disableEditing = () => {
        setIsEditing(false);
    }

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
        if (e.key === "Escape") {
            disableEditing();
        }
    }
    
    useOnClickOutside(formRef as React.RefObject<HTMLElement>, disableEditing);
    useEventListener("keydown", onKeyDown);

    const onSubmit = (formData: FormData) => {
        const descriptionValue = formData.get("description") as string;
        const boardId = params.boardId as string;
        const cardId = data.id;
        execute({
            title: data.title,
            description: descriptionValue || undefined,
            boardId,
            id: cardId,
        });
    }
    return (
        <div className="flex items-start gap-x-3 w-full">
            <AlignLeft className="h-5 w-5 mt-0.5 text-neutral-700"/>
            <div className="w-full">
                <p className="font-semibold mb-2 text-neutral-700">
                    Description
                </p>
                {
                    isEditing ? (
                        <form
                           ref={formRef}
                           className="space-y-2"
                           action={onSubmit}
                        >
                            <FormTextarea
                                id="description"
                                className="w-full mt-2"
                                placeholder="Enter a description..."
                                defaultValue={data.description || ""}
                                errors={fieldErrors}
                                ref={textareaRef}
                            />
                            <div className="flex items-center gap-x-2">
                                <FormButton>
                                    Save
                                </FormButton>
                                <Button
                                    type="button"
                                    onClick={disableEditing}
                                    variant="ghost" 
                                    size="sm"
                                >
                                    <X className="h-4 w-4"/>
                                </Button>
                            </div>
                        </form>
                    ) : (
                    <div
                    role="button"
                    onClick={enableEditing}
                    className="min-h-[78px] bg-neutral-200 text-sm font-medium py-3 px-3.5 rounded-md cursor-pointer hover:bg-neutral-300/50 transition"
                >
                    {data.description || "Add a description..."}
                
                </div>
                )}
            </div>
        </div>
    )
};

Description.Skeleton = function DescriptionSkeleton() {
    return (
        <div className="flex items-start gap-x-3 w-full">
            <Skeleton className="h-6 w-6 bg-neutral-200"/>
            <div className="w-full">
                <Skeleton className="h-6 w-24 mb-2 bg-neutral-200"/>
                <Skeleton className="h-[78px] w-full  bg-neutral-200"/>
            </div>
        </div>
    )
};