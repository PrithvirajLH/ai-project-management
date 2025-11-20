import { getBoard } from "@/lib/boards"
import { listLists, type List } from "@/lib/lists"
import { listCards, type Card } from "@/lib/cards"
import { getWorkspaceMembership } from "@/lib/workspaces"

export type BoardSnapshot = {
  boardId: string
  title: string
  lists: Array<{
    id: string
    title: string
    order: number
    cards: Array<{
      id: string
      title: string
      description?: string
      order: number
    }>
  }>
}

/**
 * Gets a clean snapshot of the board state for AI agent consumption.
 * Verifies user has access to the board's workspace before returning data.
 *
 * @param boardId - The ID of the board to snapshot
 * @param userId - The ID of the user requesting the snapshot (for access check)
 * @returns BoardSnapshot with lists and cards, or null if board not found or user lacks access
 */
export async function getBoardSnapshot(
  boardId: string,
  userId: string
): Promise<BoardSnapshot | null> {
  // Get the board
  const board = await getBoard(boardId)
  if (!board) {
    return null
  }

  // Verify user has access to the board's workspace
  const membership = await getWorkspaceMembership(userId, board.workspaceId)
  if (!membership) {
    return null
  }

  // Get all lists for this board (already sorted by order)
  const lists: List[] = await listLists(boardId)

  // Get all cards for all lists
  const allCards: Card[] = await Promise.all(
    lists.map((list) => listCards(list.id))
  ).then((cardArrays) => cardArrays.flat())

  // Structure lists with their cards
  const listsWithCards = lists.map((list) => ({
    id: list.id,
    title: list.title,
    order: list.order,
    cards: allCards
      .filter((card) => card.listId === list.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        order: card.order,
      })),
  }))

  return {
    boardId,
    title: board.title,
    lists: listsWithCards,
  }
}

