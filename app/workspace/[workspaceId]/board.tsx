"use client"

import { useTransition } from "react"

import { deleteBoard } from "@/actions/delete-borad";
import { Button } from "@/components/ui/button";

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
    const [isPending, startTransition] = useTransition()

    const handleDelete = () => {
        startTransition(async () => {
            await deleteBoard(id, workspaceId)
        })
    }

    return (
        <div className="flex items-center gap-x-2">
            <p>
                Board Title: {title}
            </p>
            <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
                {isPending ? "Deleting..." : "Delete"}
            </Button>
        </div>
    )
}