import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

import { z } from "zod"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getBoard } from "@/lib/boards"
import { getWorkspaceMembership } from "@/lib/workspaces"
import { createList as createListSchema } from "@/actions/create-list/schema"
import { createList as persistCreateList, listLists } from "@/lib/lists"
import { Action, createAuditLog, EntityType } from "@/lib/create-audit-log"

const CreateListBody = createListSchema

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const json = await request.json()
    const body = CreateListBody.parse(json)
    const { boardId, title } = body

    const board = await getBoard(boardId)
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    const membership = await getWorkspaceMembership(session.user.id, board.workspaceId)
    if (!membership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const existingLists = await listLists(boardId)
    const maxOrder =
      existingLists.length > 0 ? Math.max(...existingLists.map((list) => list.order ?? 0)) : 0

    const list = await persistCreateList({
      boardId,
      title,
      order: maxOrder + 1,
    })

    await createAuditLog({
      entityId: list.id,
      entityType: EntityType.LIST,
      entityTitle: list.title,
      action: Action.CREATE,
    })

    revalidatePath(`/board/${boardId}`)

    return NextResponse.json({ list }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }

    console.error("Failed to create list via API route:", error)
    return NextResponse.json({ error: "Failed to create list" }, { status: 500 })
  }
}

