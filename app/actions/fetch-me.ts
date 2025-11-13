"use server"

export type GraphMeResponse = {
  displayName?: string | null
  jobTitle?: string | null
  department?: string | null
  mail?: string | null
}

export async function fetchMe(accessToken: string) {
  if (!accessToken) {
    throw new Error("Missing access token")
  }

  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me?$select=displayName,jobTitle,department,mail",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    let body: string | null = null

    try {
      body = await response.text()
    } catch {
      // ignore body read errors
    }

    console.error("Graph /me failed", response.status, body ?? "")
    return null
  }

  return (await response.json()) as GraphMeResponse
}


