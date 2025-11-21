import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session?.user?.id && session.personalWorkspace) {
    redirect(`/workspace/${session.personalWorkspace.id}`)
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
