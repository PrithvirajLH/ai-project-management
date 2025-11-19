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
          //scope: "openid profile email offline_access User.Read",
          scope: "openid profile email offline_access User.Read User.ReadBasic.All Mail.Send",
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
    async jwt({ token, user, account, trigger }) {
      // Initial sign in - store tokens and user info
      if (account?.access_token) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        // Azure AD tokens typically expire in 1 hour (3600 seconds)
        // If expires_at is not provided, default to 1 hour from now
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000
      }

      // Return previous token if the access token has not expired yet
      if (
        token.accessTokenExpires &&
        typeof token.accessTokenExpires === "number" &&
        Date.now() < token.accessTokenExpires
      ) {
        return token
      }

      // Access token has expired, try to update it using refresh token
      // Skip refresh if there's already an error (prevents infinite loop)
      if (token.refreshToken && !token.error) {
        try {
          const response = await fetch(
            `https://login.microsoftonline.com/${getEnv("AZURE_AD_TENANT_ID")}/oauth2/v2.0/token`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                client_id: getEnv("AZURE_AD_CLIENT_ID"),
                client_secret: getEnv("AZURE_AD_CLIENT_SECRET"),
                grant_type: "refresh_token",
                refresh_token: token.refreshToken as string,
                scope: "openid profile email offline_access User.Read User.ReadBasic.All Mail.Send",
              }),
            }
          )

          const refreshedTokens = await response.json()

          if (!response.ok) {
            throw new Error("Failed to refresh token")
          }

          token.accessToken = refreshedTokens.access_token
          token.accessTokenExpires = Date.now() + (refreshedTokens.expires_in ?? 3600) * 1000
          if (refreshedTokens.refresh_token) {
            token.refreshToken = refreshedTokens.refresh_token
          }
        } catch (error) {
          console.error("Error refreshing access token:", error)
          // Return the token without updating - will cause user to re-authenticate
          return { ...token, error: "RefreshAccessTokenError" }
        }
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

      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

