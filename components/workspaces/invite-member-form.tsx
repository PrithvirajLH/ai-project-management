"use client"

import { FormEvent, useState } from "react"
import { useAction } from "@/hooks/use-action"
import { inviteWorkspaceMember } from "@/actions/invite-workspace-member"
import { FormInput } from "@/components/forms/form-input"
import { FormButton } from "@/components/forms/form-button"
import { toast } from "sonner"

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
    <form className="space-y-3 border-t pt-3" onSubmit={handleSubmit}>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Invite member
        </label>
        <p className="text-xs text-muted-foreground">
          Send an invitation to collaborate in this workspace.
        </p>
      </div>
      <FormInput
        id="email"
        name="email"
        type="email"
        label="Email address"
        placeholder="Enter email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        errors={fieldErrors}
        disabled={isLoading}
        required
      />
      <FormButton className="w-full" disabled={isLoading}>
        {isLoading ? "Sending…" : "Send invitation"}
      </FormButton>
    </form>
  )
}


