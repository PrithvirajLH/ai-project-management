import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCard, updateCard as persistUpdateCard } from "@/lib/cards";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";
import { getList } from "@/lib/lists";
import { updateCard as UpdateCardSchema } from "@/actions/update-card/schema";
import { Action, createAuditLog, EntityType } from "@/lib/create-audit-log";

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

        // Return card with list information (CardWithList)
        return NextResponse.json({
            ...card,
            list,
        });

    } catch (error) {
        console.error("Failed to get card:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ cardId: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await params;

    try {
        const json = await request.json();
        const body = UpdateCardSchema.parse({ ...json, id: cardId });
        const { boardId, title, description } = body;

        const card = await getCard(cardId);
        if (!card) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        const list = await getList(card.listId);
        if (!list) {
            return NextResponse.json({ error: "List not found" }, { status: 404 });
        }

        if (list.boardId !== boardId) {
            return NextResponse.json({ error: "Card does not belong to the specified board" }, { status: 400 });
        }

        const board = await getBoard(boardId);
        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        const membership = await getWorkspaceMembership(session.user.id, board.workspaceId);
        if (!membership) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const updatedCard = await persistUpdateCard({
            cardId,
            listId: list.id,
            title,
            description,
        });

        await createAuditLog({
            entityId: card.id,
            entityType: EntityType.CARD,
            entityTitle: card.title,
            action: Action.UPDATE,
        });

        revalidatePath(`/board/${boardId}`);

        return NextResponse.json({ card: updatedCard });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.flatten() }, { status: 400 });
        }

        console.error("Failed to update card:", error);
        return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
    }
}

