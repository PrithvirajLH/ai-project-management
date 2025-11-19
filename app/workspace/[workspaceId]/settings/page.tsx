import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { WorkspaceBadge } from "@/components/workspaces/workspace-badge"
import { getWorkspaceMembership } from "@/lib/workspaces"
import { InviteMemberForm } from "@/components/workspaces/invite-member-form"

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/api/auth/signin")
  }

  const { workspaceId } = await params
  const membership = await getWorkspaceMembership(session.user.id, workspaceId)

  if (!membership) {
    redirect(`/workspace/${workspaceId}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Workspace Profile</h1>
        <WorkspaceBadge workspace={membership} />
      </div>
      <p className="text-sm text-muted-foreground">
        Manage workspace details and collaboration preferences for {membership.name}.
      </p>

      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Workspace Details</h2>
            <p className="text-sm text-muted-foreground">
              Update the basics for {membership.name}.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition hover:border-primary"
          >
            Edit workspace
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-background p-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Workspace name</h3>
            <p className="mt-1 text-base font-medium text-foreground">{membership.name}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background p-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Workspace ID</h3>
            <p className="mt-1 text-base font-medium text-foreground">{membership.id}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Members</h2>
            <p className="text-sm text-muted-foreground">
              Invite teammates to collaborate in this workspace.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background p-4">
            <div>
              <p className="text-sm font-medium text-foreground">You</p>
              <p className="text-xs text-muted-foreground">Owner</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              owner
            </span>
          </div>
          {membership.role === "owner" && (
            <InviteMemberForm workspaceId={workspaceId} />
          )}
          {membership.role !== "owner" && (
            <div className="rounded-lg border border-dashed border-border/60 bg-background p-4 text-sm text-muted-foreground">
              Only workspace owners can invite members.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}