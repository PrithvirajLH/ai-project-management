import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"

export default async function Home() {
  const session = await getServerSession(authOptions)

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold sm:text-4xl">
        {session?.user ? `Welcome${session.user.name ? `, ${session.user.name}` : ""}!` : "AI Project Management"}
      </h1>
      <p className="text-base text-muted-foreground sm:text-lg">
        {session?.user
          ? "Use the account menu in the top right to manage your session."
          : "Sign in with your organization's Microsoft account using the button in the navbar."}
      </p>
      {session?.user?.email ? (
        <p className="text-sm text-muted-foreground">Signed in as {session.user.email}</p>
      ) : null}
    </main>
  )
}
