import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listBoards } from "@/lib/boards";
import { getWorkspaceMembership } from "@/lib/workspaces";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
  }

  try {
    // Check if user has access to this workspace
    const membership = await getWorkspaceMembership(session.user.id, workspaceId);
    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const boards = await listBoards(workspaceId);
    return NextResponse.json({ boards });
  } catch (error) {
    console.error("Failed to list boards", error);
    return NextResponse.json({ error: "Failed to list boards" }, { status: 500 });
  }
}

