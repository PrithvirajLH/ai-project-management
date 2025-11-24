import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Users, UserPlus, Mail, Calendar, Shield, Building2, Lock, Copy, CheckCircle2, Clock } from "lucide-react"

import { authOptions } from "@/lib/auth"
import { WorkspaceBadge } from "@/components/workspaces/workspace-badge"
import { getWorkspaceMembership, listWorkspaceInvitations, listWorkspaceMembers } from "@/lib/workspaces"
import { InviteMemberForm } from "@/components/workspaces/invite-member-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { CopyButton } from "@/components/workspaces/copy-button"

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

  function getInitials(name?: string | null, email?: string | null) {
    const source = name || email
    if (!source) return "U" // "U" for "User" instead of "?"
    return source
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("")
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl glass-card border border-border/40 shadow-lg">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                Workspace Settings
                <WorkspaceBadge workspace={membership} />
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Manage workspace details and collaboration preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Details Card */}
      <div className="glass-card rounded-2xl border border-border/40 p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Workspace Details</h2>
            <p className="text-sm text-muted-foreground">
              Basic information about your workspace
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-background/50 p-6 transition-all duration-300 hover:border-border hover:shadow-lg card-hover">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/50 border border-border/30">
                <Building2 className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Workspace name</h3>
                <p className="text-lg font-semibold text-foreground truncate">{membership.name}</p>
              </div>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-background/50 p-6 transition-all duration-300 hover:border-border hover:shadow-lg card-hover">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/50 border border-border/30">
                <Shield className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Workspace ID</h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-medium text-foreground truncate">{membership.id}</p>
                  <CopyButton text={membership.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members Section */}
      <div className="glass-card rounded-2xl border border-border/40 p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
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

        <Separator className="mb-6" />

        <div className="space-y-3">
          {members.map((member) => {
            const isCurrentUser = member.userId === currentUserId
            const displayName = isCurrentUser
              ? "You"
              : member.name ?? member.email ?? member.userId
            const isOwner = member.role === "owner"
            
            // For current user, use session data; for others, use member data
            const avatarName = isCurrentUser 
              ? (session.user?.name ?? session.user?.email)
              : (member.name ?? member.email)
            const avatarEmail = isCurrentUser
              ? session.user?.email
              : member.email
            const avatarImage = isCurrentUser
              ? session.user?.image
              : undefined
            
            return (
              <div
                key={member.userId}
                className="group flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-5 transition-all duration-300 hover:border-border hover:shadow-lg card-hover"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                    {avatarImage && (
                      <AvatarImage src={avatarImage} alt={displayName} />
                    )}
                    <AvatarFallback className="bg-muted text-sm font-semibold">
                      {getInitials(avatarName, avatarEmail)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-semibold text-foreground truncate">
                        {displayName}
                      </p>
                      {isOwner && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          <Shield className="h-3 w-3" />
                          <span className="text-xs font-semibold">Owner</span>
                        </div>
                      )}
                    </div>
                    {member.email && member.email !== displayName && (
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {member.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {invitations.filter((invite) => invite.status === "pending").length > 0 && (
            <div className="space-y-4 rounded-xl border border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-800/30 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    Pending Invitations
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {invitations.filter((invite) => invite.status === "pending").length}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Waiting for members to accept their invitations
                  </p>
                </div>
              </div>
              <Separator className="bg-amber-200/50 dark:bg-amber-800/30" />
              <div className="space-y-2.5">
                {invitations
                  .filter((invite) => invite.status === "pending")
                  .map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-lg border border-amber-200/50 dark:border-amber-800/30 bg-background/80 p-4 transition-all duration-200 hover:border-amber-300/50 dark:hover:border-amber-700/50 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
                        <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{invite.email}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Invited {invite.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 shrink-0 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {membership.role === "owner" && !membership.isPersonal && (
            <div className="rounded-xl border border-border/50 bg-background/50 p-6 glass-card">
              <InviteMemberForm workspaceId={workspaceId} />
            </div>
          )}
          {membership.role === "owner" && membership.isPersonal && (
            <div className="flex items-start gap-4 rounded-xl border border-dashed border-border/50 bg-muted/30 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 border border-border/30">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1.5">Personal Workspace</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Personal workspaces are private and cannot have members invited.
                </p>
              </div>
            </div>
          )}
          {membership.role !== "owner" && (
            <div className="flex items-start gap-4 rounded-xl border border-dashed border-border/50 bg-muted/30 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 border border-border/30">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1.5">Permission Required</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
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