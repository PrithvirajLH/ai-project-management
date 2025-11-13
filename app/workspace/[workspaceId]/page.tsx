import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { Board } from "./board"
import { authOptions } from "@/lib/auth"
import { ensurePersonalWorkspace, getWorkspaceMembership } from "@/lib/workspaces"
import { listBoards } from "@/lib/boards"
import { WorkspaceBoardForm } from "@/components/form"

interface WorkspacePageProps {
  params: Promise<{ workspaceId: string }>
}

export default async function WorkspaceIdPage({ params }: WorkspacePageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/api/auth/signin")
  }

  const { workspaceId } = await params

  await ensurePersonalWorkspace({
    userId: session.user.id,
    userName: session.user.name ?? null,
  })

  const membership = await getWorkspaceMembership(session.user.id, workspaceId)

  if (!membership) {
    notFound()
  }

  const boards = await listBoards(membership.id)

  return (
    <div className="flex max-w-4xl flex-col gap-4 px-6">
      <WorkspaceBoardForm workspaceId={membership.id} />

      <div className="space-y-2">
        {boards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No boards yet. Create one to get started.</p>
        ) : (
          boards.map((board) => (
            <Board key={board.id} title={board.title} id={board.id} workspaceId={membership.id} />
          ))
        )}
      </div>
    </div>
  )
}