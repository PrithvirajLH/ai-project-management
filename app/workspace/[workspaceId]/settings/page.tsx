import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Users, UserPlus, Mail, Calendar, Shield, Building2, Lock } from "lucide-react"

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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Workspace Settings</h1>
          <WorkspaceBadge workspace={membership} />
        </div>
        <p className="text-sm text-muted-foreground">
          Manage workspace details and collaboration preferences for <span className="font-medium text-foreground">{membership.name}</span>.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Workspace Details</h2>
              <p className="text-sm text-muted-foreground">
                Basic information about your workspace
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="group relative overflow-hidden rounded-lg border border-border/60 bg-background p-5 transition-all hover:border-border hover:shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Workspace name</h3>
                <p className="text-base font-semibold text-foreground truncate">{membership.name}</p>
              </div>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-lg border border-border/60 bg-background p-5 transition-all hover:border-border hover:shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Workspace ID</h3>
                <p className="text-sm font-mono font-medium text-foreground truncate">{membership.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Team Members</h2>
              <p className="text-sm text-muted-foreground">
                {membership.isPersonal
                  ? "Personal workspaces are private to you and cannot have members invited."
                  : "Manage who can access and collaborate in this workspace."}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {members.map((member) => {
            const isCurrentUser = member.userId === currentUserId
            const displayName = isCurrentUser
              ? "You"
              : member.name ?? member.email ?? member.userId
            const isOwner = member.role === "owner"
            
            return (
              <div
                key={member.userId}
                className="group flex items-center justify-between rounded-lg border border-border/60 bg-background p-4 transition-all hover:border-border hover:shadow-sm"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    isOwner ? "bg-primary/10" : "bg-muted"
                  }`}>
                    {isOwner ? (
                      <Shield className="h-5 w-5 text-primary" />
                    ) : (
                      <Users className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {displayName}
                      </p>
                      {isCurrentUser && (
                        <span className="text-xs text-muted-foreground">(You)</span>
                      )}
                    </div>
                    {member.email && member.email !== displayName && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {member.email}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold shrink-0 ${
                  isOwner
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {member.role}
                </span>
              </div>
            )
          })}

          {invitations.filter((invite) => invite.status === "pending").length > 0 && (
            <div className="space-y-3 rounded-lg border border-dashed border-border/60 bg-muted/30 p-5">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Pending Invitations</h3>
                <span className="ml-auto rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-semibold text-yellow-600">
                  {invitations.filter((invite) => invite.status === "pending").length}
                </span>
              </div>
              <div className="space-y-2">
                {invitations
                  .filter((invite) => invite.status === "pending")
                  .map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-background p-3.5 transition-all hover:border-border/60"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-500/10">
                        <Mail className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{invite.email}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Invited {invite.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-600 shrink-0">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {membership.role === "owner" && !membership.isPersonal && (
            <div className="rounded-lg border border-border/60 bg-background p-5">
              <InviteMemberForm workspaceId={workspaceId} />
            </div>
          )}
          {membership.role === "owner" && membership.isPersonal && (
            <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Personal Workspace</p>
                <p className="text-sm text-muted-foreground">
                  Personal workspaces are private and cannot have members invited.
                </p>
              </div>
            </div>
          )}
          {membership.role !== "owner" && (
            <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Permission Required</p>
                <p className="text-sm text-muted-foreground">
                  Only workspace owners can invite members.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}