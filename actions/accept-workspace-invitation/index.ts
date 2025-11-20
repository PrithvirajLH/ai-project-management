"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getWorkspaceInvitationByToken,
  updateInvitationStatus,
  ensureWorkspaceMembership,
  getWorkspaceById,
  ensureMembershipTable,
} from "@/lib/workspaces"
import { InputType, ReturnType } from "./type"
import { createSafeAction } from "@/lib/create-safe-actions"
import { acceptWorkspaceInvitation as acceptWorkspaceInvitationSchema } from "./schema"
import { redirect } from "next/navigation"

const handler = async (data: InputType): Promise<ReturnType> => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  const { token } = data

  try {
    // Get invitation by token
    const invitation = await getWorkspaceInvitationByToken(token)

    if (!invitation) {
      return { error: "Invitation not found" }
    }

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      return { error: "This invitation is no longer valid" }
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      await updateInvitationStatus({
        invitationId: invitation.id,
        workspaceId: invitation.workspaceId,
        status: "expired",
      })
      return { error: "This invitation has expired" }
    }

    // Verify the workspace still exists
    const workspace = await getWorkspaceById(invitation.workspaceId)
    if (!workspace) {
      return { error: "Workspace not found" }
    }

    // Create workspace membership
    const membershipClient = await ensureMembershipTable()
    await ensureWorkspaceMembership({
      membershipClient,
      workspace,
      userId: session.user.id,
      role: invitation.role,
      userName: session.user.name ?? null,
      userEmail: session.user.email ?? null,
    })

    // Update invitation status to accepted
    const updatedInvitation = await updateInvitationStatus({
      invitationId: invitation.id,
      workspaceId: invitation.workspaceId,
      status: "accepted",
    })

    if (!updatedInvitation) {
      return { error: "Failed to update invitation status" }
    }

    revalidatePath(`/workspace/${invitation.workspaceId}`)
    
    // Redirect to workspace after successful acceptance
    redirect(`/workspace/${invitation.workspaceId}`)
  } catch (error) {
    // Check if this is a redirect error - don't catch redirect errors
    if (error && typeof error === "object" && "digest" in error) {
      throw error
    }
    console.error("Failed to accept invitation:", error)
    return { error: "Failed to accept invitation" }
  }
}

export const acceptWorkspaceInvitation = createSafeAction(
  acceptWorkspaceInvitationSchema,
  handler
)


