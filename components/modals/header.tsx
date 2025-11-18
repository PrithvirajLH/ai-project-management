"use client";

import { CardWithList } from "@/types";
import { Layout } from "lucide-react";
import { FormInput } from "../forms/form-input";
import { useRef, useState, useEffect } from "react";
import { Skeleton } from "../ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { updateCard } from "@/actions/update-card";
import { useAction } from "@/hooks/use-action";
import { toast } from "sonner";


interface HeaderProps {
    data: CardWithList;
}
export const Header = ({
    data,
}: HeaderProps) => {
    const queryClient = useQueryClient();
    const params = useParams();
    const inputRef = useRef<HTMLInputElement>(null);

    const {execute} = useAction(updateCard,{
        onSuccess: (updatedCard) => {
            queryClient.invalidateQueries({
                queryKey: ["card", updatedCard.id],
            });
            // Update local state with the new title
            setTitle(updatedCard.title);
            toast.success(`Card renamed to "${updatedCard.title}"`);
        },
        onError: (error) => {
            toast.error(error);
        },
    });
    
    const [title, setTitle] = useState(data.title || "");

    // Sync title state when data.title changes (e.g., after refetch)
    useEffect(() => {
        setTitle(data.title || "");
    }, [data.title]);

    const onBlur = () => {
        inputRef.current?.form?.requestSubmit();
    }

    const onSubmit = (formData: FormData) => {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const boardId = params.boardId as string;
        const cardId = data.id;
        if (title === data.title) return;

        execute({
            title,
            boardId,
            id: cardId,
        })
    }
    
    return (
        <div className="flex items-center gap-x-3 mb-6 w-full">
            <Layout className="h-5 w-5 mt-1 text-neutral-700"/>
            <div className="w-full">
                <form action={onSubmit}>
                    <FormInput
                        ref={inputRef}
                        onBlur={onBlur}
                        id="title"
                        value={title ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                        className="font-semibold text-xl px-1 text-neutral-700 bg-transparent border-transparent relative
                        -left-1.5 w-[95%] focus-visible:bg-white focus-visible:border-input mb-0.5 truncate"
                    />
                </form>
                <p className="text-sm text-muted-foreground">
                    in list <span className="underline">{data.list.title}</span>

                </p>
            </div>
        </div>
    )
}

Header.Skeleton = function HeaderSkeleton() {
    return (
        <div className="flex items-center gap-x-3 mb-6">
            <Skeleton className="h-6 w-6 mt-1 bg-neutral-200"/>
            <div>
                <Skeleton className="h-6 w-24 mb-1 bg-neutral-200"/>
                <Skeleton className="h-4 w-12  bg-neutral-200"/>
            </div>
        </div>
    );
}