"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { List } from "@/lib/lists";
import {  MoreHorizontal, X } from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger, PopoverClose} from "@/components/ui/popover";
import { FormButton } from "@/components/forms/form-button";
import { Separator } from "@/components/ui/separator";
import { useAction } from "@/hooks/use-action";
import { deleteList } from "@/actions/delete-list";
import { toast } from "sonner";
import { useRef } from "react";
import { copyList } from "@/actions/copy-list";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
interface ListOptionsProps {
    data: List;
    onAddCard: () => void;
}

export const ListOptions = ({ data, onAddCard }: ListOptionsProps) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const closeRef = useRef<HTMLButtonElement>(null);

    const {execute: executeDelete, isLoading: isDeleting} = useAction(deleteList, {
        onSuccess: (data) => {
            toast.success(`List "${data.title}" deleted successfully`);
            closeRef.current?.click();
            setShowDeleteDialog(false);
        },
        onError: (error) => {
            toast.error(error);
        },
    });

    const {execute: executeCopy} = useAction(copyList, {
        onSuccess: (data) => {
            toast.success(`List "${data.title}" copied successfully`);
            closeRef.current?.click();
        },
        onError: (error) => {
            toast.error(error);
        },
    });

    const handleDelete = () => {
        executeDelete({ id: data.id, boardId: data.boardId });
    };

    const onCopy = (formData: FormData) => {
        const id = formData.get("id") as string;
        const boardId = formData.get("boardId") as string;
        executeCopy({ id, boardId });
    };

    return (
        <>
            <Popover>
                <PopoverTrigger asChild>
                    <Button className="h-auto w-auto p-2" variant="ghost" >
                        <MoreHorizontal className="w-4 h-4"/>
                    </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" className="px-0 pt-3 pb-3">
                    <div className="text-sm font-medium text-center text-neutral-600 pb-4"> 
                        List Options
                    </div>
                    <PopoverClose ref={closeRef} asChild>
                        <Button className="absolute top-2 right-2 h-auto w-auto p-2 text-neutral-600" variant="ghost">
                            <X className="w-4 h-4"/>
                        </Button>
                    </PopoverClose>
                    <Button 
                        onClick={onAddCard}
                        className="rounded-none w-full h-auto p-2 px-5 justify-start font-normal text-sm"
                        variant="ghost"
                    >
                        Add card...
                    </Button>
                    <form action={onCopy}>
                        <input hidden id="id" name="id" value={data.id} onChange={()=>{}}/>
                        <input hidden id="boardId" name="boardId" value={data.boardId} onChange={()=>{}}/>
                        <FormButton
                            variant="ghost"
                            className="rounded-none w-full h-auto p-2 px-5 justify-start font-normal text-sm"
                        >
                            Copy list...
                        </FormButton>
                    </form>
                    <Separator/>
                    <Button
                        variant="ghost"
                        onClick={() => setShowDeleteDialog(true)}
                        className="rounded-none w-full h-auto p-2 px-5 justify-start font-normal text-sm"
                    >
                        Delete list...
                    </Button>
                </PopoverContent>
            </Popover>
            <DeleteConfirmationDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                onConfirm={handleDelete}
                title="Delete List"
                description="This will permanently delete the list and all its cards."
                itemName={data.title}
                isLoading={isDeleting}
            />
        </>
    );
};