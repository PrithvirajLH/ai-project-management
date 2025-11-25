import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

import { runTeamsIntakeWorkflow, type TriageResult } from "@/lib/agents/teams-intake-workflow"
import { createCard as persistCreateCard } from "@/lib/cards"
import { getList } from "@/lib/lists"
import { createAuditLog, Action, EntityType } from "@/lib/create-audit-log"

type TeamsMessagePayload = {
  teamMessageId: string
  text: string
}

const TEAMS_ACTOR_ID = process.env.TEAMS_INTAKE_USER_ID ?? "teams-intake"
const TEAMS_ACTOR_NAME = process.env.TEAMS_INTAKE_USERNAME ?? "Teams Intake"

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key")
  if (!apiKey || apiKey !== process.env.TEAMS_INTAKE_API_KEY) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  let payload: TeamsMessagePayload
  try {
    payload = (await request.json()) as TeamsMessagePayload
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  if (!payload.teamMessageId || !payload.text) {
    return NextResponse.json(
      { success: false, error: "Missing teamMessageId or text" },
      { status: 400 }
    )
  }

  try {
    const triage = await runTeamsIntakeWorkflow(payload.text)

    if (triage.action === "no_card") {
      return NextResponse.json(
        {
          success: true,
          created: false,
          reason: triage.reason,
          message_type: triage.message_type,
        },
        { status: 200 }
      )
    }

    const target = mapMessageTypeToTarget(triage.message_type)
    const list = await getList(target.listId)

    if (!list) {
      return NextResponse.json(
        { success: false, error: "Target list not found. Confirm configuration." },
        { status: 400 }
      )
    }

    if (list.boardId !== target.boardId) {
      return NextResponse.json(
        { success: false, error: "Configured board/list mismatch. Confirm configuration." },
        { status: 400 }
      )
    }

    const description = buildCardDescription({
      payload,
    })

    const card = await persistCreateCard({
      listId: target.listId,
      title: triage.card.title ?? "New request from Teams",
      description,
    })

    await createAuditLog({
      entityId: card.id,
      entityType: EntityType.CARD,
      entityTitle: card.title,
      action: Action.CREATE,
      isAgentAction: true,
      userId: TEAMS_ACTOR_ID,
      username: TEAMS_ACTOR_NAME,
    })

    revalidatePath(`/board/${target.boardId}`)

    return NextResponse.json(
      {
        success: true,
        created: true,
        cardId: card.id,
        cardTitle: card.title,
        boardId: target.boardId,
        listId: target.listId,
        message_type: triage.message_type,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[TEAMS_INTAKE_ERROR]", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    )
  }
}

function buildCardDescription({ payload }: { payload: TeamsMessagePayload }) {
  return ["Original message:", payload.text].join("\n")
}

function mapMessageTypeToTarget(messageType: TriageResult["message_type"]) {
  const defaultBoardId = process.env.TEAMS_DEFAULT_BOARD_ID
  const defaultListId = process.env.TEAMS_DEFAULT_LIST_ID

  const config: Record<TriageResult["message_type"], { boardId?: string; listId?: string }> = {
    service_request: {
      boardId: process.env.TEAMS_SERVICE_REQUEST_BOARD_ID ?? defaultBoardId,
      listId: process.env.TEAMS_SERVICE_REQUEST_LIST_ID ?? defaultListId,
    },
    incident: {
      boardId: process.env.TEAMS_INCIDENT_BOARD_ID ?? defaultBoardId,
      listId: process.env.TEAMS_INCIDENT_LIST_ID ?? defaultListId,
    },
    investigation: {
      boardId: process.env.TEAMS_INVESTIGATION_BOARD_ID ?? defaultBoardId,
      listId: process.env.TEAMS_INVESTIGATION_LIST_ID ?? defaultListId,
    },
    question: {
      boardId: process.env.TEAMS_QUESTION_BOARD_ID ?? defaultBoardId,
      listId: process.env.TEAMS_QUESTION_LIST_ID ?? defaultListId,
    },
    other: {
      boardId: defaultBoardId,
      listId: defaultListId,
    },
  }

  const target = config[messageType]

  if (!target.boardId || !target.listId) {
    throw new Error(
      `Missing board/list configuration for message type "${messageType}". Ensure TEAMS_* env vars are set.`
    )
  }

  return target as { boardId: string; listId: string }
}


