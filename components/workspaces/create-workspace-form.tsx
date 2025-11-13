"use client"

import { FormEvent, useState } from "react"

import { WorkspaceListItem } from "@/components/workspaces/types"

type CreateWorkspaceFormProps = {
  onCreate: (workspace: WorkspaceListItem) => void
}

type CreateWorkspaceResponse = {
  workspace: {
    id: string
    name: string
    slug: string
    role: "owner" | "member"
    isPersonal: boolean
    ownerId: string
  }
}

export function CreateWorkspaceForm({ onCreate }: CreateWorkspaceFormProps) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()

    if (!trimmed) {
      setError("Workspace name is required.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })

      let payload: unknown = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? (payload as { error?: string }).error ?? null
            : null
        throw new Error(message ?? "Failed to create workspace.")
      }

      const workspace = (payload as CreateWorkspaceResponse | null)?.workspace

      if (!workspace) {
        throw new Error("Invalid response from server.")
      }

      onCreate(workspace)
      setName("")
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unable to create workspace.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-2 border-t pt-3" onSubmit={handleSubmit}>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Create workspace
        </label>
        <p className="text-xs text-muted-foreground">
          Workspaces let you collaborate with teammates. Personal workspace stays private.
        </p>
      </div>
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Workspace name"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating…" : "Create workspace"}
      </button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  )
}

