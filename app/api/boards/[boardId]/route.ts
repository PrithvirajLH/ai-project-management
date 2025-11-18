import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBoard } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";

interface RouteContext {
  params: Promise<{ boardId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { boardId } = await context.params;

  if (!boardId) {
    return NextResponse.json({ error: "Board ID is required" }, { status: 400 });
  }

  try {
    const board = await getBoard(boardId);
    
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check if user has access to this workspace
    const membership = await getWorkspaceMembership(session.user.id, board.workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ board });
  } catch (error) {
    console.error("Failed to get board", error);
    return NextResponse.json({ error: "Failed to get board" }, { status: 500 });
  }
}
