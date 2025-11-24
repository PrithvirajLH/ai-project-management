"use client"

import { useState } from "react";
import { deleteBoard } from "@/actions/delete-board";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";

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
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
        <>
            <div className="flex items-center gap-x-2">
                <p>
                    Board Title: {title}
                </p>
                <Button type="button" variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} disabled={isLoading}>
                    {isLoading ? "Deleting..." : "Delete"}
                </Button>
            </div>
            <DeleteConfirmationDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                onConfirm={handleDelete}
                title="Delete Board"
                description="This will permanently delete the board and all its lists and cards."
                itemName={title}
                isLoading={isLoading}
            />
        </>
    )
}