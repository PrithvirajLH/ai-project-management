import { NextResponse } from "next/server"
import { getServerSession, type Session } from "next-auth"

import { authOptions } from "@/lib/auth"
import { createWorkflow, listWorkflows } from "@/lib/workflows"
import { getWorkspaceMembership, listAccessibleWorkspaces } from "@/lib/workspaces"

async function resolveWorkspaceId(session: Session | null, url: URL, userId: string | undefined): Promise<string | null> {
  const param = url.searchParams.get("workspaceId")
  if (param) {
    // If param is "personal", look up the actual workspace by slug
    if (param === "personal" && userId) {
      const workspaces = await listAccessibleWorkspaces(userId)
      const personalWorkspace = workspaces.find((w) => w.slug === "personal" && w.isPersonal)
      return personalWorkspace?.id ?? null
    }
    return param
  }

  // No param provided, use personal workspace from session
  // But resolve "personal" to actual UUID if needed
  const sessionWorkspaceId = session?.personalWorkspace?.id ?? null
  if (sessionWorkspaceId === "personal" && userId) {
    const workspaces = await listAccessibleWorkspaces(userId)
    const personalWorkspace = workspaces.find((w) => w.slug === "personal" && w.isPersonal)
    return personalWorkspace?.id ?? null
  }
  
  return sessionWorkspaceId
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const workspaceId = await resolveWorkspaceId(session, url, session.user.id)

  if (!workspaceId) {
    return NextResponse.json({ workflows: [] })
  }

  const membership = await getWorkspaceMembership(session.user.id, workspaceId)
  if (!membership) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
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
  const workspaceId = await resolveWorkspaceId(session, url, session.user.id)

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
  }

  const membership = await getWorkspaceMembership(session.user.id, workspaceId)
  if (!membership) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
  }

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


