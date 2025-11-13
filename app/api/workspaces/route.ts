import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { createWorkspace, ensurePersonalWorkspace, listAccessibleWorkspaces } from "@/lib/workspaces"

function groupWorkspaces(workspaces: Awaited<ReturnType<typeof listAccessibleWorkspaces>>) {
  const personal = workspaces.filter((workspace) => workspace.isPersonal)
  const owned = workspaces.filter((workspace) => !workspace.isPersonal && workspace.role === "owner")
  const shared = workspaces.filter((workspace) => !workspace.isPersonal && workspace.role !== "owner")

  return { personal, owned, shared }
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const workspace = await ensurePersonalWorkspace({
      userId: session.user.id,
      userName: session.user.name ?? null,
    })

    const workspaces = await listAccessibleWorkspaces(session.user.id)
    const grouped = groupWorkspaces(workspaces)

    return NextResponse.json({
      personalWorkspace: workspace,
      workspaces: grouped,
    })
  } catch (error) {
    console.error("Failed to list workspaces", error)
    return NextResponse.json({ error: "Failed to list workspaces" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json()) as { name?: unknown }
    const name = typeof body.name === "string" ? body.name.trim() : ""

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const workspace = await createWorkspace({
      userId: session.user.id,
      name,
    })

    const summary = {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: "owner" as const,
      isPersonal: workspace.isPersonal,
      ownerId: workspace.ownerId,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    }

    return NextResponse.json({ workspace: summary }, { status: 201 })
  } catch (error) {
    console.error("Failed to create workspace", error)
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 })
  }
}

