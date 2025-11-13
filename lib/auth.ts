import AzureADProvider from "next-auth/providers/azure-ad"
import { type NextAuthOptions } from "next-auth"

import { ensurePersonalWorkspace } from "@/lib/workspaces"

function getEnv(variable: string) {
  const value = process.env[variable]

  if (!value) {
    throw new Error(`Missing required environment variable: ${variable}`)
  }

  return value
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: getEnv("AZURE_AD_CLIENT_ID"),
      clientSecret: getEnv("AZURE_AD_CLIENT_SECRET"),
      tenantId: getEnv("AZURE_AD_TENANT_ID"),
      authorization: {
        params: {
          scope: "openid profile email offline_access User.Read",
        },
      },
      profile(profile) {
        return {
          id:
            (profile as { sub?: string }).sub ??
            (profile as { oid?: string }).oid ??
            (profile as { id?: string }).id ??
            "",
          name:
            (profile as { name?: string }).name ??
            (profile as { displayName?: string }).displayName ??
            null,
          email:
            (profile as { email?: string }).email ??
            (profile as { preferred_username?: string }).preferred_username ??
            null,
          image: (profile as { picture?: string }).picture ?? null,
          jobTitle:
            (profile as { jobTitle?: string | null }).jobTitle ??
            (profile as { jobtitle?: string | null }).jobtitle ??
            null,
          department: (profile as { department?: string | null }).department ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token
      }

      if (user) {
        token.jobTitle =
          (user as { jobTitle?: string | null }).jobTitle ?? (token as { jobTitle?: string | null }).jobTitle ?? null
        token.department =
          (user as { department?: string | null }).department ??
          (token as { department?: string | null }).department ??
          null
      }

      const userId =
        (user as { id?: string })?.id ??
        token.sub ??
        (token as { userId?: string | null }).userId ??
        null

      if (userId) {
        const workspace = await ensurePersonalWorkspace({
          userId,
          userName: (user as { name?: string | null })?.name ?? null,
        })

        token.personalWorkspaceId = workspace.id
        token.personalWorkspaceSlug = workspace.slug
        token.personalWorkspaceName = workspace.name
        ;(token as { userId?: string | null }).userId = userId
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id ?? undefined
        session.user.jobTitle =
          (token as { jobTitle?: string | null }).jobTitle ?? session.user.jobTitle ?? null
        session.user.department =
          (token as { department?: string | null }).department ?? session.user.department ?? null
      }

      session.accessToken =
        (token as { accessToken?: string | null }).accessToken ??
        session.accessToken ??
        null

      session.personalWorkspace = {
        id: (token as { personalWorkspaceId?: string | null }).personalWorkspaceId ?? "personal",
        slug: (token as { personalWorkspaceSlug?: string | null }).personalWorkspaceSlug ?? "personal",
        name:
          (token as { personalWorkspaceName?: string | null }).personalWorkspaceName ??
          "Personal Workspace",
      }

      session.activeWorkspace = session.personalWorkspace

      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

