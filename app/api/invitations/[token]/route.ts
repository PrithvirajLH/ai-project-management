import { NextResponse } from "next/server"
import { getWorkspaceInvitationByToken } from "@/lib/workspaces"

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params

    if (!token) {
      return NextResponse.json({ error: "Invitation token is required" }, { status: 400 })
    }

    const invitation = await getWorkspaceInvitationByToken(token)

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        {
          error: "This invitation has expired",
          invitation: {
            ...invitation,
            status: "expired" as const,
          },
        },
        { status: 410 }
      )
    }

    // Return invitation data (public endpoint)
    return NextResponse.json({
      invitation: {
        id: invitation.id,
        workspaceId: invitation.workspaceId,
        workspaceName: invitation.workspaceName,
        email: invitation.email,
        invitedBy: invitation.invitedBy,
        invitedByName: invitation.invitedByName,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Failed to get invitation:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}


