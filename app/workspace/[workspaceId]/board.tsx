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
    const deleteBoardWithId = deleteBoard.bind(null, id, workspaceId);

    return (
        <form action={deleteBoardWithId} className="flex items-center gap-x-2">
            <p>
                Board Title: {title}
            </p>
            <Button type="submit" variant="destructive" size="sm">
                Delete
            </Button>
        </form>
    )
}