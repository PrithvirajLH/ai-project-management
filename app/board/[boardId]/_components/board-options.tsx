"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";

import { MoreHorizontal, X } from "lucide-react";
import { useAction } from "@/hooks/use-action";
import { deleteBoard } from "@/actions/delete-board";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";

interface BoardOptionsProps {
    id: string;
    title: string;
}

const BoardOptions = ({ id, title }: BoardOptionsProps) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const {execute, isLoading} = useAction(deleteBoard, {
        onError: (error) => {
            toast.error(error);
        },
    });

    const onDelete = () => {
        // Show toast before deletion since redirect prevents onSuccess from firing
        toast.success(`Board "${title}" deleted`);
        execute({ id });
    }

    return (
        <>
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="transparent" size="icon" className="h-auto w-auto p-2">
                    <MoreHorizontal className="w-4 h-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="px-0 pt-3 pb-3">
                <div className="text-sm font-medium text-center text-neutral-600 pb-4">
                    Board Action
                </div>
                <PopoverClose asChild>
                    <Button className="h-auto w-auto p-2 absolute top-2 right-2 text-neutral-600" variant="ghost">
                        <X className="w-4 h-4" />
                    </Button>
                </PopoverClose>
                <Button variant="ghost" onClick={() => setShowDeleteDialog(true)}
                    disabled={isLoading}
                    className="rounded-none w-full h-auto p-2 px-5 justify-start font-normal text-sm">
                        Delete Board
                </Button>
            </PopoverContent>
        </Popover>
        <DeleteConfirmationDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onConfirm={onDelete}
            title="Delete Board"
            description="This will permanently delete the board and all its lists and cards."
            itemName={title}
            isLoading={isLoading}
        />
        </>
    )
}

export default BoardOptions;