import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { createWorkflow, listWorkflows } from "@/lib/workflows"

function getWorkspaceId(session: Awaited<ReturnType<typeof getServerSession>>, url: URL) {
  const param = url.searchParams.get("workspaceId")
  if (param) {
    return param
  }

  return session?.activeWorkspace?.id ?? session?.personalWorkspace?.id ?? null
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const workspaceId = getWorkspaceId(session, url)

  if (!workspaceId) {
    return NextResponse.json({ workflows: [] })
  }

  try {
    const workflows = await listWorkflows(workspaceId)
    return NextResponse.json({ workflows })
  } catch (error) {
    console.error("Failed to list workflows", error)
    return NextResponse.json({ error: "Failed to list workflows" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const workspaceId =
    getWorkspaceId(session, url) ?? session.personalWorkspace?.id ?? "personal"

  try {
    const body = (await request.json()) as { name?: unknown }
    const name = typeof body.name === "string" ? body.name.trim() : ""

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const workflow = await createWorkflow({ workspaceId, name })
    return NextResponse.json({ workflow }, { status: 201 })
  } catch (error) {
    console.error("Failed to create workflow", error)
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 })
  }
}


