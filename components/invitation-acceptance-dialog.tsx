"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAction } from "@/hooks/use-action"
import { acceptWorkspaceInvitation } from "@/actions/accept-workspace-invitation"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type InvitationData = {
  id: string
  workspaceId: string
  workspaceName: string
  email: string
  invitedBy: string
  invitedByName?: string
  status: string
  expiresAt: string
}

type InvitationAcceptanceDialogProps = {
  invitation: InvitationData
  invitationToken: string
  isOpen: boolean
}

export function InvitationAcceptanceDialog({
  invitation,
  invitationToken,
  isOpen,
}: InvitationAcceptanceDialogProps) {
  const router = useRouter()
  const [isRejecting, setIsRejecting] = React.useState(false)
  const { execute: acceptInvitation, isLoading: isAccepting } = useAction(acceptWorkspaceInvitation, {
    onSuccess: () => {
      toast.success(`You've joined ${invitation.workspaceName}`)
      router.push(`/workspace/${invitation.workspaceId}`)
    },
    onError: (error) => {
      toast.error(error)
    },
  })

  const handleAccept = () => {
    acceptInvitation({ token: invitationToken })
  }

  const handleReject = () => {
    setIsRejecting(true)
    // For now, just redirect - we can implement rejection logic later
    router.push("/")
  }

  const inviterName = invitation.invitedByName ?? "Someone"

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Workspace Invitation</DialogTitle>
          <DialogDescription>
            {inviterName} has invited you to collaborate in the <strong>{invitation.workspaceName}</strong> workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleAccept}
            disabled={isAccepting || isRejecting}
            className="flex-1"
          >
            {isAccepting ? "Accepting…" : "Accept"}
          </Button>
          <Button
            onClick={handleReject}
            disabled={isAccepting || isRejecting}
            variant="outline"
            className="flex-1"
          >
            {isRejecting ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

