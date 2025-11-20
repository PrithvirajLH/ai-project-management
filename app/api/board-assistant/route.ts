import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getBoardSnapshot } from "@/lib/board-snapshot"
import { runWorkflow } from "@/lib/board-assistant-workflow"
import { getBoard } from "@/lib/boards"
import { getWorkspaceMembership } from "@/lib/workspaces"
import { getList } from "@/lib/lists"
import { getCard, createCard as persistCreateCard, listCards, updateCard as persistUpdateCard } from "@/lib/cards"
import { createList as persistCreateList, listLists, updateList as persistUpdateList } from "@/lib/lists"
import { createCard as createCardSchema } from "@/actions/create-card/schema"
import { createList as createListSchema } from "@/actions/create-list/schema"
import { z } from "zod"
import { Action, createAuditLog, EntityType } from "@/lib/create-audit-log"

// Execute a tool call by calling business logic directly (since we're on the server)
async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  boardId: string,
  userId: string
): Promise<unknown> {
  try {
    switch (toolName) {
      case "create_card": {
        const requestBody = {
          title: args.title as string,
          listId: args.listId as string,
          boardId: (args.boardId || boardId) as string,
        }
        console.log("[Board Assistant] Creating card with:", requestBody)
        
        // Validate input
        const body = createCardSchema.parse(requestBody)
        const { title, boardId: cardBoardId, listId } = body

        // Check list exists and belongs to board
        const list = await getList(listId)
        if (!list) {
          throw new Error("List not found")
        }
        if (list.boardId !== cardBoardId) {
          throw new Error("List does not belong to the specified board")
        }

        // Check board access
        const board = await getBoard(cardBoardId)
        if (!board) {
          throw new Error("Board not found")
        }
        const membership = await getWorkspaceMembership(userId, board.workspaceId)
        if (!membership) {
          throw new Error("Unauthorized")
        }

        // Create card
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

        revalidatePath(`/board/${cardBoardId}`)

        return { card }
      }

      case "move_card": {
        const moveBoardId = (args.boardId || boardId) as string
        const cardId = args.cardId as string
        const destinationListId = args.destinationListId as string
        const destinationIndex = (args.destinationIndex ?? 0) as number
        
        console.log("[Board Assistant] Moving card with:", { moveBoardId, cardId, destinationListId, destinationIndex })
        
        // Get card and lists
        const card = await getCard(cardId)
        if (!card) {
          throw new Error("Card not found")
        }

        const sourceList = await getList(card.listId)
        if (!sourceList) {
          throw new Error("Source list not found")
        }

        const destinationList = await getList(destinationListId)
        if (!destinationList) {
          throw new Error("Destination list not found")
        }

        if (sourceList.boardId !== moveBoardId || destinationList.boardId !== moveBoardId) {
          throw new Error("Lists do not belong to the specified board")
        }

        // Check board access
        const board = await getBoard(moveBoardId)
        if (!board) {
          throw new Error("Board not found")
        }
        const membership = await getWorkspaceMembership(userId, board.workspaceId)
        if (!membership) {
          throw new Error("Unauthorized")
        }

        // Move card
        const sourceCards = await listCards(sourceList.id)
        const destinationCards =
          sourceList.id === destinationList.id ? sourceCards : await listCards(destinationList.id)

        const currentIndex = sourceCards.findIndex((item) => item.id === cardId)
        if (currentIndex === -1) {
          throw new Error("Card not found in source list")
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

        revalidatePath(`/board/${moveBoardId}`)

        return { success: true }
      }

      case "update_card": {
        const updateBoardId = (args.boardId || boardId) as string
        const cardId = args.cardId as string
        const title = args.title as string | undefined
        const description = args.description as string | undefined
        
        console.log("[Board Assistant] Updating card with:", { updateBoardId, cardId, title, description })
        
        // Get card
        const card = await getCard(cardId)
        if (!card) {
          throw new Error("Card not found")
        }

        const list = await getList(card.listId)
        if (!list) {
          throw new Error("List not found")
        }

        if (list.boardId !== updateBoardId) {
          throw new Error("Card does not belong to the specified board")
        }

        // Check board access
        const board = await getBoard(updateBoardId)
        if (!board) {
          throw new Error("Board not found")
        }
        const membership = await getWorkspaceMembership(userId, board.workspaceId)
        if (!membership) {
          throw new Error("Unauthorized")
        }

        // Update card
        const updatedCard = await persistUpdateCard({
          cardId,
          listId: list.id,
          title,
          description,
        })

        await createAuditLog({
          entityId: card.id,
          entityType: EntityType.CARD,
          entityTitle: card.title,
          action: Action.UPDATE,
        })

        revalidatePath(`/board/${updateBoardId}`)

        return { card: updatedCard }
      }

      case "create_list": {
        const requestBody = {
          title: args.title as string,
          boardId: (args.boardId || boardId) as string,
        }
        console.log("[Board Assistant] Creating list with:", requestBody)
        
        // Validate input
        const body = createListSchema.parse(requestBody)
        const { title, boardId: listBoardId } = body

        // Check board access
        const board = await getBoard(listBoardId)
        if (!board) {
          throw new Error("Board not found")
        }
        const membership = await getWorkspaceMembership(userId, board.workspaceId)
        if (!membership) {
          throw new Error("Unauthorized")
        }

        // Create list
        const existingLists = await listLists(listBoardId)
        const maxOrder =
          existingLists.length > 0 ? Math.max(...existingLists.map((list) => list.order ?? 0)) : 0

        const list = await persistCreateList({
          boardId: listBoardId,
          title,
          order: maxOrder + 1,
        })

        await createAuditLog({
          entityId: list.id,
          entityType: EntityType.LIST,
          entityTitle: list.title,
          action: Action.CREATE,
        })

        revalidatePath(`/board/${listBoardId}`)

        return { list }
      }

      case "rename_list": {
        const renameBoardId = (args.boardId || boardId) as string
        const listId = args.listId as string
        const title = (args.newTitle || args.title) as string
        
        console.log("[Board Assistant] Renaming list with:", { renameBoardId, listId, title })
        
        // Get list
        const list = await getList(listId)
        if (!list) {
          throw new Error("List not found")
        }

        if (list.boardId !== renameBoardId) {
          throw new Error("List does not belong to the specified board")
        }

        // Check board access
        const board = await getBoard(renameBoardId)
        if (!board) {
          throw new Error("Board not found")
        }
        const membership = await getWorkspaceMembership(userId, board.workspaceId)
        if (!membership) {
          throw new Error("Unauthorized")
        }

        // Update list
        const updatedList = await persistUpdateList({
          listId,
          boardId: renameBoardId,
          title,
        })

        await createAuditLog({
          entityId: list.id,
          entityType: EntityType.LIST,
          entityTitle: list.title,
          action: Action.UPDATE,
        })

        revalidatePath(`/board/${renameBoardId}`)

        return { list: updatedList }
      }

      case "reorder_list": {
        const reorderBoardId = (args.boardId || boardId) as string
        const items = args.items as Array<{ id: string; order: number }> | undefined

        if (!items || !Array.isArray(items)) {
          throw new Error("items array is required for reorder_list")
        }

        console.log("[Board Assistant] Reordering lists with:", { reorderBoardId, items })

        // Check board access
        const board = await getBoard(reorderBoardId)
        if (!board) {
          throw new Error("Board not found")
        }
        const membership = await getWorkspaceMembership(userId, board.workspaceId)
        if (!membership) {
          throw new Error("Unauthorized")
        }

        // Verify all list IDs belong to this board
        const allLists = await listLists(reorderBoardId)
        const listIds = new Set(allLists.map((list) => list.id))
        for (const item of items) {
          if (!listIds.has(item.id)) {
            throw new Error(`List ${item.id} does not belong to board ${reorderBoardId}`)
          }
        }

        // Update each list's order
        const updatedLists = await Promise.all(
          items.map((item) =>
            persistUpdateList({
              listId: item.id,
              boardId: reorderBoardId,
              order: item.order,
            })
          )
        )

        // Create audit log for each reordered list
        for (const list of updatedLists) {
          await createAuditLog({
            entityId: list.id,
            entityType: EntityType.LIST,
            entityTitle: list.title,
            action: Action.UPDATE,
          })
        }

        revalidatePath(`/board/${reorderBoardId}`)

        return { lists: updatedLists }
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error("Unknown error executing tool")
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const body = await request.json()
    const { boardId, message, conversationHistory } = body

    if (!boardId || !message) {
      return NextResponse.json(
        { error: "boardId and message are required" },
        { status: 400 }
      )
    }

    // Get board snapshot
    const snapshot = await getBoardSnapshot(boardId, userId)
    if (!snapshot) {
      return NextResponse.json(
        { error: "Board not found or access denied" },
        { status: 404 }
      )
    }

    // Create tool executor that calls business logic directly (we're on the server)
    const toolExecutor = async (toolName: string, args: Record<string, unknown>) => {
      try {
        const result = await executeToolCall(toolName, args, boardId, userId)
        console.log(`[Board Assistant] Tool ${toolName} execution result:`, JSON.stringify(result, null, 2))
        return result
      } catch (error) {
        console.error(`[Board Assistant] Tool ${toolName} execution error:`, error)
        throw error
      }
    }

    // Run the workflow
    const workflowInput = {
      input_as_text: `User request: ${message}\n\nCurrent board snapshot (JSON): ${JSON.stringify(snapshot, null, 2)}`,
      userMessage: message,
      boardId: boardId,
      boardSnapshot: snapshot,
      conversationHistory: conversationHistory || [], // Pass previous conversation history
    }

    const result = await runWorkflow(workflowInput, toolExecutor)

    // Revalidate the board page to ensure fresh data on next request
    revalidatePath(`/board/${boardId}`)

    // Refresh snapshot after tool execution to get updated state
    const updatedSnapshot = await getBoardSnapshot(boardId, userId)

    return NextResponse.json({
      message: result.output_text,
      snapshot: updatedSnapshot || snapshot, // Return updated snapshot if available
    })
  } catch (error) {
    console.error("Board assistant error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    )
  }
}
