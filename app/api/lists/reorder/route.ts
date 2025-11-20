import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBoard } from "@/lib/boards"
import { getWorkspaceMembership } from "@/lib/workspaces"
import { updateList as persistUpdateList, listLists } from "@/lib/lists"
import { Action, createAuditLog, EntityType } from "@/lib/create-audit-log"

const ReorderListsBody = z.object({
  boardId: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
    })
  ),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const json = await request.json()
    const body = ReorderListsBody.parse(json)
    const { boardId, items } = body

    const board = await getBoard(boardId)
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    const membership = await getWorkspaceMembership(session.user.id, board.workspaceId)
    if (!membership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Verify all list IDs belong to this board
    const allLists = await listLists(boardId)
    const listIds = new Set(allLists.map((list) => list.id))
    for (const item of items) {
      if (!listIds.has(item.id)) {
        return NextResponse.json(
          { error: `List ${item.id} does not belong to board ${boardId}` },
          { status: 400 }
        )
      }
    }

    // Update each list's order
    const updatedLists = await Promise.all(
      items.map((item) =>
        persistUpdateList({
          listId: item.id,
          boardId,
          order: item.order,
        })
      )
    )

    // Create audit log for the reorder operation
    for (const list of updatedLists) {
      await createAuditLog({
        entityId: list.id,
        entityType: EntityType.LIST,
        entityTitle: list.title,
        action: Action.UPDATE,
      })
    }

    revalidatePath(`/board/${boardId}`)

    return NextResponse.json({ lists: updatedLists })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }

    console.error("Failed to reorder lists:", error)
    return NextResponse.json({ error: "Failed to reorder lists" }, { status: 500 })
  }
}

