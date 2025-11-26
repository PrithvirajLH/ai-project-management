import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { listAccessibleWorkspaces } from "@/lib/workspaces"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session?.user?.id && session.personalWorkspace) {
    let workspaceId = session.personalWorkspace.id
    
    // If workspaceId is "personal" (fallback), look up the actual UUID
    if (workspaceId === "personal") {
      const workspaces = await listAccessibleWorkspaces(session.user.id)
      const personalWorkspace = workspaces.find((w) => w.slug === "personal" && w.isPersonal)
      if (personalWorkspace) {
        workspaceId = personalWorkspace.id
      }
    }
    
    redirect(`/workspace/${workspaceId}`)
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold sm:text-5xl tracking-tight">AI Project Management</h1>
        <p className="text-base text-muted-foreground sm:text-lg max-w-xl mx-auto">
          Sign in with your organization&apos;s Microsoft account using the button in the navbar.
        </p>
      </div>
    </main>
  )
}
