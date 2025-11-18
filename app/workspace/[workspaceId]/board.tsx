"use client"

import { deleteBoard } from "@/actions/delete-board";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { toast } from "sonner";

interface BoardProps {
    title: string;
    id: string;
    workspaceId: string;
}

export const Board = ({
    title,
    id,
    workspaceId,
}: BoardProps) => {
    const { execute, isLoading } = useAction(deleteBoard, {
        onError: (error) => {
            toast.error(error);
        },
    });

    const handleDelete = () => {
        // Show toast before deletion since redirect prevents onSuccess from firing
        toast.success(`Board "${title}" deleted`);
        execute({ id });
    };

    return (
        <div className="flex items-center gap-x-2">
            <p>
                Board Title: {title}
            </p>
            <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isLoading}>
                {isLoading ? "Deleting..." : "Delete"}
            </Button>
        </div>
    )
}