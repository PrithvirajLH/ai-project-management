import { Board, getBoard } from "@/lib/boards";
import { BoardTitleForm } from "./board-title-form";
import BoardOptions from "./board-options";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BoardNavbarProps {
    data:Board;
}

export const BoardNavbar = async ({ data }: BoardNavbarProps) => {
    
    return (
        <div className="w-full h-14 z-40 bg-black/20 fixed top-14 flex items-center px-6 gap-x-4 text-white pt-2">
            <Link href={`/workspace/${data.workspaceId}`}>
                <Button
                    variant="transparent"
                    className="h-auto w-auto p-2 px-3 rounded-lg transition-all duration-300 
                               hover:bg-muted/50 hover:shadow-sm hover:scale-105 spotlight-hover group"
                >
                    <ArrowLeft className="h-6 w-8 text-white group-hover:text-primary transition-all duration-300 stroke-5" strokeWidth={3} />
                </Button>
            </Link>
            <BoardTitleForm data={data} />
            <div className="ml-auto">
                <BoardOptions id={data.id} title={data.title} />

            </div>
        </div>
    )
}