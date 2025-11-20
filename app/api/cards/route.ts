import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBoard } from "@/lib/boards"
import { getWorkspaceMembership } from "@/lib/workspaces"
import { getList } from "@/lib/lists"
import { createCard as persistCreateCard, listCards } from "@/lib/cards"
import { createCard as createCardSchema } from "@/actions/create-card/schema"
import { Action, createAuditLog, EntityType } from "@/lib/create-audit-log"

const CreateCardBody = createCardSchema

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const json = await request.json()
    const body = CreateCardBody.parse(json)
    const { title, boardId, listId } = body

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

    const existingCards = await listCards(listId)
    const lastCard = existingCards.length > 0 ? existingCards[existingCards.length - 1] : null
    const newOrder = lastCard ? lastCard.order + 1 : 1

    const card = await persistCreateCard({
      listId,
      title,
      order: newOrder,
    })

    await createAuditLog({
      entityId: card.id,
      entityType: EntityType.CARD,
      entityTitle: card.title,
      action: Action.CREATE,
    })

    revalidatePath(`/board/${boardId}`)

    return NextResponse.json({ card }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }

    console.error("Failed to create card via API route:", error)
    return NextResponse.json({ error: "Failed to create card" }, { status: 500 })
  }
}

