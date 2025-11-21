"use client"

import { FormEvent, useState } from "react"
import { useAction } from "@/hooks/use-action"
import { inviteWorkspaceMember } from "@/actions/invite-workspace-member"
import { FormInput } from "@/components/forms/form-input"
import { FormButton } from "@/components/forms/form-button"
import { toast } from "sonner"
import { UserPlus, Mail } from "lucide-react"

type InviteMemberFormProps = {
  workspaceId: string
  onSuccess?: () => void
}

export function InviteMemberForm({ workspaceId, onSuccess }: InviteMemberFormProps) {
  const [email, setEmail] = useState("")
  const { execute, fieldErrors, isLoading } = useAction(inviteWorkspaceMember, {
    onSuccess: (data) => {
      toast.success(`Invitation sent to ${data.email}`)
      setEmail("")
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error)
    },
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = email.trim()

    if (!trimmed) {
      toast.error("Email is required")
      return
    }

    execute({
      workspaceId,
      email: trimmed,
      role: "member",
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <UserPlus className="h-4 w-4 text-primary" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground">
            Invite New Member
          </label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Send an invitation email to collaborate in this workspace
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <FormInput
          id="email"
          name="email"
          type="email"
          label="Email address"
          placeholder="colleague@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          errors={fieldErrors}
          disabled={isLoading}
          required
        />
        <FormButton className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Mail className="h-4 w-4" />
              Sending invitation…
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              Send invitation
            </>
          )}
        </FormButton>
      </div>
    </form>
  )
}


