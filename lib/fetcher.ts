export const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Failed to fetch" }))
    throw new Error(error.error ?? "Failed to fetch")
  }
  return res.json()
}