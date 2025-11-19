import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { InvitationAcceptancePage } from "./_components/invitation-acceptance-page"

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage(props: PageProps) {
  const session = await getServerSession(authOptions)
  const { token } = await props.params

  // If not authenticated, redirect to sign-in with callback
  if (!session?.user?.id) {
    const callbackUrl = `/invite/${token}`
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  return <InvitationAcceptancePage token={token} />
}


