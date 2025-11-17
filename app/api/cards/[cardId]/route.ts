import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCard } from "@/lib/cards";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { getList } from "@/lib/lists";

export async function GET(
    request: Request, 
    { params }: { params: Promise<{ cardId: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { cardId } = await params;

        if (!cardId) {
            return NextResponse.json({ error: "Card ID is required" }, { status: 400 });
        }

        const card = await getCard(cardId);

        if (!card) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        // Verify the list exists and get the board
        const list = await getList(card.listId);
        if (!list) {
            return NextResponse.json({ error: "List not found" }, { status: 404 });
        }

        const board = await getBoard(list.boardId);
        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        // Check if user has access to the board's workspace
        const membership = await getWorkspaceMembership(session.user.id, board.workspaceId);
        if (!membership) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        return NextResponse.json(card);

    } catch (error) {
        console.error("Failed to get card:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

