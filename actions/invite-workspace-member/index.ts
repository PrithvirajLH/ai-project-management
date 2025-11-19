"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getWorkspaceById, getWorkspaceMembership, createWorkspaceInvitation } from "@/lib/workspaces"
import { generateInvitationToken } from "@/lib/generate-invitation-token"
import { searchUserByEmail } from "@/app/actions/search-user-by-email"
import { sendInvitationEmail } from "@/app/actions/send-invitation-email"
import { InputType, ReturnType } from "./type"
import { createSafeAction } from "@/lib/create-safe-actions"
import { inviteWorkspaceMember as inviteWorkspaceMemberSchema } from "./schema"

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  if (!session?.accessToken) {
    return { error: "Access token required for sending invitations. Please sign out and sign in again." }
  }

  const { workspaceId, email, role } = data

  try {
    // Get workspace to verify it exists
    const workspace = await getWorkspaceById(workspaceId)

    if (!workspace) {
      return { error: "Workspace not found" }
    }

    // Check if user has access to the workspace
    const membership = await getWorkspaceMembership(session.user.id, workspaceId)
    if (!membership) {
      return { error: "Unauthorized" }
    }

    // Only workspace owners can invite members
    if (membership.role !== "owner") {
      return { error: "Only workspace owners can invite members" }
    }

    // Try to find user by email via Graph API (for internal users)
    const graphUser = await searchUserByEmail(session.accessToken, email)

    // If user found in Graph, check if they're already a member
    if (graphUser?.id) {
      const userMembership = await getWorkspaceMembership(graphUser.id, workspaceId)
      if (userMembership) {
        return { error: "User is already a member of this workspace" }
      }
    }

    // Generate invitation token and expiration (7 days)
    const invitationToken = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation record
    const invitation = await createWorkspaceInvitation({
      workspaceId,
      email: graphUser?.email ?? email,
      workspaceName: workspace.name,
      invitedBy: session.user.id,
      invitedByName: session.user.name ?? undefined,
      role,
      invitationToken,
      expiresAt,
    })

    // Generate invitation link
    const inviteLink = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/invite/${invitationToken}`

    // Send invitation email
    await sendInvitationEmail({
      accessToken: session.accessToken,
      toEmail: email,
      workspaceName: workspace.name,
      inviterName: session.user.name ?? "Someone",
      inviteLink,
    })

    return { data: invitation }
  } catch (error) {
    console.error("Failed to invite workspace member:", error)
    return { error: "Failed to invite workspace member" }
  }
}

export const inviteWorkspaceMember = createSafeAction(inviteWorkspaceMemberSchema, handler)

