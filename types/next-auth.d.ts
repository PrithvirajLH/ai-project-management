import { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id?: string
      jobTitle?: string | null
      department?: string | null
    }
    accessToken?: string | null
    personalWorkspace?: {
      id: string
      slug: string
      name: string
    }
  }
  interface User extends DefaultUser {
    jobTitle?: string | null
    department?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    jobTitle?: string | null
    department?: string | null
    accessToken?: string | null
    refreshToken?: string | null
    accessTokenExpires?: number | null
    error?: string
    personalWorkspaceId?: string | null
    personalWorkspaceSlug?: string | null
    personalWorkspaceName?: string | null
    userId?: string | null
  }
}

