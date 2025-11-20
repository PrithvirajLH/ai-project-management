import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBoard } from "@/lib/boards"
import { getWorkspaceMembership } from "@/lib/workspaces"
import { getCard, listCards, updateCard as persistUpdateCard } from "@/lib/cards"
import { getList } from "@/lib/lists"
import { Action, createAuditLog, EntityType } from "@/lib/create-audit-log"

const MoveCardSchema = z.object({
  boardId: z.string(),
  cardId: z.string(),
  destinationListId: z.string(),
  destinationIndex: z.number().int().min(0),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const json = await request.json()
    const { boardId, cardId, destinationListId, destinationIndex } = MoveCardSchema.parse(json)

    const card = await getCard(cardId)
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    const sourceList = await getList(card.listId)
    if (!sourceList) {
      return NextResponse.json({ error: "Source list not found" }, { status: 404 })
    }

    const destinationList = await getList(destinationListId)
    if (!destinationList) {
      return NextResponse.json({ error: "Destination list not found" }, { status: 404 })
    }

    if (sourceList.boardId !== boardId || destinationList.boardId !== boardId) {
      return NextResponse.json(
        { error: "Lists do not belong to the specified board" },
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

    const sourceCards = await listCards(sourceList.id)
    const destinationCards =
      sourceList.id === destinationList.id ? sourceCards : await listCards(destinationList.id)

    const currentIndex = sourceCards.findIndex((item) => item.id === cardId)
    if (currentIndex === -1) {
      return NextResponse.json({ error: "Card not found in source list" }, { status: 404 })
    }

    const [removedCard] = sourceCards.splice(currentIndex, 1)
    const targetIndex = Math.min(Math.max(destinationIndex, 0), destinationCards.length)

    if (sourceList.id === destinationList.id) {
      destinationCards.splice(targetIndex, 0, removedCard)

      await Promise.all(
        destinationCards.map((item, index) =>
          persistUpdateCard({
            cardId: item.id,
            listId: destinationList.id,
            order: index,
          })
        )
      )
    } else {
      destinationCards.splice(targetIndex, 0, {
        ...removedCard,
        listId: destinationList.id,
      })

      await Promise.all([
        ...sourceCards.map((item, index) =>
          persistUpdateCard({
            cardId: item.id,
            listId: sourceList.id,
            order: index,
          })
        ),
        ...destinationCards.map((item, index) =>
          persistUpdateCard({
            cardId: item.id,
            listId: destinationList.id,
            order: index,
          })
        ),
      ])
    }

    await createAuditLog({
      entityId: card.id,
      entityType: EntityType.CARD,
      entityTitle: card.title,
      action: Action.UPDATE,
    })

    revalidatePath(`/board/${boardId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }

    console.error("Failed to move card:", error)
    return NextResponse.json({ error: "Failed to move card" }, { status: 500 })
  }
}

