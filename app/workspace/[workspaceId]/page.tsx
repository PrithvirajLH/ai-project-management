import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { WorkspaceSummary, ensurePersonalWorkspace, getWorkspaceMembership } from "@/lib/workspaces"
import { listWorkflows } from "@/lib/workflows"
import { WorkspaceBadge } from "@/components/workspaces/workspace-badge"

type WorkspacePageProps = {
  params: Promise<{ workspaceId: string }>
}

function WorkspaceMetadata({ workspace }: { workspace: WorkspaceSummary }) {
  return (
    <header className="flex flex-col gap-1 border-b border-border pb-4">
      <div className="flex items-center gap-2">
        <WorkspaceBadge workspace={workspace} />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">{workspace.name}</h1>
      {!workspace.isPersonal ? (
        <p className="text-sm text-muted-foreground">
          You&apos;re {workspace.role === "owner" ? "managing" : "collaborating in"} this workspace.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          This workspace is private to you—create shared workspaces to collaborate.
        </p>
      )}
    </header>
  )
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/api/auth/signin")
  }

  const { workspaceId } = await params
  const targetWorkspaceId = workspaceId || session.personalWorkspace?.id || "personal"

  await ensurePersonalWorkspace({
    userId: session.user.id,
    userName: session.user.name ?? null,
  })

  const membership = await getWorkspaceMembership(session.user.id, targetWorkspaceId)

  if (!membership) {
    notFound()
  }

  const workflows = await listWorkflows(membership.id)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <WorkspaceMetadata workspace={membership} />
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Workflows</h2>
          <p className="text-sm text-muted-foreground">
            Coming soon: manage boards, assign teammates, and track progress.
          </p>
        </div>
        {workflows.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
            No workflows yet. Create one to get your workspace moving.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {workflows.map((workflow) => (
              <li key={workflow.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-2">
                  <p className="text-base font-medium text-foreground">{workflow.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Created on {workflow.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

