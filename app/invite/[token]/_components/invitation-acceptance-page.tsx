"use client"

import { useQuery } from "@tanstack/react-query"
import { fetcher } from "@/lib/fetcher"
import { InvitationAcceptanceDialog } from "@/components/invitation-acceptance-dialog"

type InvitationResponse = {
  invitation: {
    id: string
    workspaceId: string
    workspaceName: string
    email: string
    invitedBy: string
    invitedByName?: string
    status: string
    expiresAt: string
  }
}

type InvitationAcceptancePageProps = {
  token: string
}

export function InvitationAcceptancePage({ token }: InvitationAcceptancePageProps) {
  const { data, isLoading, error } = useQuery<InvitationResponse>({
    queryKey: ["invitation", token],
    queryFn: () => fetcher(`/api/invitations/${token}`),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Loading invitation…</p>
        </div>
      </div>
    )
  }

  if (error || !data?.invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Invitation not found</p>
          <p className="text-sm text-muted-foreground mt-2">
            This invitation may have expired or is invalid.
          </p>
        </div>
      </div>
    )
  }

  const invitation = data.invitation

  // Check if invitation has expired
  if (new Date(invitation.expiresAt) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Invitation Expired</p>
          <p className="text-sm text-muted-foreground mt-2">
            This invitation has expired. Please request a new invitation.
          </p>
        </div>
      </div>
    )
  }

  // Check if invitation is already accepted/rejected
  if (invitation.status !== "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">
            {invitation.status === "accepted" ? "Invitation Already Accepted" : "Invitation No Longer Valid"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            This invitation has already been processed.
          </p>
        </div>
      </div>
    )
  }

  return <InvitationAcceptanceDialog invitation={invitation} invitationToken={token} isOpen={true} />
}

