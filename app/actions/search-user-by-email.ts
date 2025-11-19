"use server"

export type GraphUserSearchResponse = {
  value: Array<{
    id?: string
    mail?: string
    userPrincipalName?: string
    displayName?: string
  }>
}

export async function searchUserByEmail(accessToken: string, email: string) {
  if (!accessToken) {
    throw new Error("Missing access token")
  }

  if (!email) {
    throw new Error("Email is required")
  }

  try {
    // Search for user by email using Microsoft Graph API
    const encodedEmail = encodeURIComponent(email)
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users?$filter=mail eq '${encodedEmail}' or userPrincipalName eq '${encodedEmail}'&$select=id,mail,userPrincipalName,displayName`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      // If user not found or access denied, return null (fallback to email-only invitation)
      if (response.status === 404 || response.status === 403) {
        return null
      }

      let body: string | null = null
      try {
        body = await response.text()
      } catch {
        // ignore body read errors
      }

      console.error("Graph user search failed", response.status, body ?? "")
      return null
    }

    const data = (await response.json()) as GraphUserSearchResponse
    const user = data.value?.[0]

    if (!user) {
      return null
    }

    return {
      id: user.id ?? null,
      email: user.mail ?? user.userPrincipalName ?? email,
      displayName: user.displayName ?? null,
    }
  } catch (error) {
    console.error("Failed to search user by email:", error)
    return null
  }
}


