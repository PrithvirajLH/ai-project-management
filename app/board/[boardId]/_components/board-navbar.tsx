import { Board, getBoard } from "@/lib/boards";
import { BoardTitleForm } from "./board-title-form";
import BoardOptions from "./board-options";

interface BoardNavbarProps {
    data:Board;
}

export const BoardNavbar = async ({ data }: BoardNavbarProps) => {
    
    return (
        <div className="w-full h-14 z-40 bg-black/20 fixed top-14 flex items-center px-6 gap-x-4 text-white pt-2">
            <BoardTitleForm data={data} />
            <div className="ml-auto">
                <BoardOptions id={data.id} title={data.title} />

            </div>
        </div>
    )
}