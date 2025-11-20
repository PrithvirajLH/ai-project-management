import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { WorkspaceBadge } from "@/components/workspaces/workspace-badge"
import { getWorkspaceMembership, listWorkspaceInvitations, listWorkspaceMembers } from "@/lib/workspaces"
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

  const members = await listWorkspaceMembers(workspaceId)
  const invitations =
    membership.role === "owner" ? await listWorkspaceInvitations(workspaceId) : []
  const currentUserId = session.user.id

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
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-background p-4"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {member.userId === currentUserId
                    ? "You"
                    : member.name ?? member.email ?? member.userId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.role === "owner" ? "Owner" : "Member"}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                {member.role}
              </span>
            </div>
          ))}

          {invitations.filter((invite) => invite.status === "pending").length > 0 && (
            <div className="space-y-2 rounded-lg border border-dashed border-border/60 bg-background p-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Pending invitations</h3>
              <div className="space-y-2">
                {invitations
                  .filter((invite) => invite.status === "pending")
                  .map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-md border border-border/40 bg-card/40 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited on {invite.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        invite.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-600"
                          : invite.status === "accepted"
                          ? "bg-green-500/10 text-green-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {invite.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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