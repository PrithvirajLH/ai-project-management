import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBoard } from "@/lib/boards"
import { getWorkspaceMembership } from "@/lib/workspaces"
import { getList, updateList as persistUpdateList } from "@/lib/lists"
import { updateList as updateListSchema } from "@/actions/update-list/schema"
import { Action, createAuditLog, EntityType } from "@/lib/create-audit-log"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { listId } = await params

  try {
    const json = await request.json()
    const body = updateListSchema.parse({ ...json, id: listId })
    const { boardId, title } = body

    const list = await getList(listId)
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 })
    }

    if (list.boardId !== boardId) {
      return NextResponse.json(
        { error: "List does not belong to the specified board" },
        { status: 400 }
      )
    }

    const board = await getBoard(boardId)
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    const membership = await getWorkspaceMembership(session.user.id, board.workspaceId)
    if (!membership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updatedList = await persistUpdateList({
      listId,
      boardId,
      title,
    })

    await createAuditLog({
      entityId: list.id,
      entityType: EntityType.LIST,
      entityTitle: list.title,
      action: Action.UPDATE,
    })

    revalidatePath(`/board/${boardId}`)

    return NextResponse.json({ list: updatedList })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }

    console.error("Failed to update list:", error)
    return NextResponse.json({ error: "Failed to update list" }, { status: 500 })
  }
}

