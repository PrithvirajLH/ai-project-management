"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardWithList } from "@/types";
import { Copy, Trash } from "lucide-react";
import { useAction } from "@/hooks/use-action";
import { copyCard } from "@/actions/copy-card";
import { deleteCard } from "@/actions/delete-card";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { useCardModal } from "@/hooks/use-card-modal";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";

interface ActionsProps {
    data: CardWithList;
}

export const Actions = ({
    data,
}: ActionsProps) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const params = useParams();
    const router = useRouter();
    const cardModal = useCardModal();
    const {execute: executeCopyCard, isLoading: isLoadingCopy} = useAction(copyCard, {
        onSuccess: () => {
            toast.success(`Card "${data.title}" copied`);
            cardModal.onClose();
        },
        onError: (error) => {
            toast.error(error);
        },
    });
    const {execute: executeDeleteCard, isLoading: isLoadingDelete} = useAction(deleteCard, {
        onSuccess: () => {
            toast.success(`Card "${data.title}" deleted`);
            cardModal.onClose();
            setShowDeleteDialog(false);
            // Refresh the page to update data in all tabs
            router.refresh();
            // Broadcast to other tabs that data has changed
            if (typeof window !== "undefined" && window.BroadcastChannel) {
                const channel = new BroadcastChannel("board-updates");
                channel.postMessage({ type: "card-deleted", boardId: params.boardId });
                channel.close();
            }
        },
        onError: () => {
            toast.error("Failed to delete card");
        },
    });

    const onCopy = () => {
        const boardId = params.boardId as string;
        executeCopyCard({ id: data.id, boardId });
    };

    const handleDelete = () => {
        const boardId = params.boardId as string;
        executeDeleteCard({ id: data.id, boardId });
    };

    return (
        <>
            <div className="space-y-2 mt-2">
                <p className="text-xs font-semibold ">Actions</p>
                <Button onClick={onCopy} disabled={isLoadingCopy} variant="gray" className="w-full justify-start" size="inline">
                    <Copy className="h-4 w-4 mr-2"/>
                    Copy
                </Button>
                <Button onClick={() => setShowDeleteDialog(true)} disabled={isLoadingDelete} variant="gray" className="w-full justify-start" size="inline">
                    <Trash className="h-4 w-4 mr-2"/>
                    Delete
                </Button>
            </div>
            <DeleteConfirmationDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                onConfirm={handleDelete}
                title="Delete Card"
                description="This will permanently delete the card."
                itemName={data.title}
                isLoading={isLoadingDelete}
            />
        </>
    )
}

Actions.Skeleton = function ActionsSkeleton() {
    return (
        <div className="space-y-2 mt-2">
            <Skeleton className="h-4 w-20 bg-neutral-200"/>
            <Skeleton className="h-8 w-full bg-neutral-200"/>
            <Skeleton className="h-8 w-full bg-neutral-200"/>
        </div>
    )
}
