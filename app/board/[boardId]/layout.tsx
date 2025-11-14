import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { BoardNavbar } from "./_components/board-navbar";

interface BoardLayoutProps {
    children: React.ReactNode;
    params: Promise<{ boardId: string }>;
}

const BoardLayout = async ({ 
    children,
    params
}: BoardLayoutProps) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/api/auth/signin");
    }

    const { boardId } = await params;
    const board = await getBoard(boardId);

    if (!board) {
        notFound();
    }

    // Check if user has access to the board's workspace
    const membership = await getWorkspaceMembership(session.user.id, board.workspaceId);
    if (!membership) {
        notFound();
    }

    return (
        <div
        className="relative min-h-[calc(100vh-4rem)] -mx-6 -mb-12 bg-no-repeat bg-cover bg-center"
        style={{backgroundImage: board.imageFullUrl ? `url(${board.imageFullUrl})` : undefined}}>    
            <BoardNavbar data={board}/> 
            <div className="absolute inset-0 bg-black/10" />  
            <main className="relative pt-28 min-h-full">
                {children}
            </main>
        </div>
    );
};

export default BoardLayout;
