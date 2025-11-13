"use client"

import { FormEvent, useEffect, useRef, useState } from "react"

import { useSession } from "next-auth/react"

type Workflow = {
  id: string
  name: string
}

export function WorkspacePill() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newWorkflowName, setNewWorkflowName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasLoadedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || hasLoadedRef.current) {
      return
    }

    async function loadWorkflows() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/workflows", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("Failed to load workflows")
        }

        const data = (await response.json()) as { workflows: Workflow[] }
        setWorkflows(data.workflows ?? [])
        hasLoadedRef.current = true
      } catch (err) {
        console.error(err)
        setError("Could not load workflows.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadWorkflows()
  }, [isOpen])

  async function handleCreateWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = newWorkflowName.trim()
    if (!trimmed) {
      setError("Workflow name is required.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })

      if (!response.ok) {
        throw new Error("Failed to create workflow")
      }

      const data = (await response.json()) as { workflow: Workflow }
      setWorkflows((prev) => [...prev, data.workflow])
      setNewWorkflowName("")
    } catch (err) {
      console.error(err)
      setError("Unable to create workflow right now.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === "loading") {
    return <div className="h-10 w-40 animate-pulse rounded-full bg-muted" />
  }

  if (!session?.user) {
    return null
  }

  const activeWorkspaceName = session.activeWorkspace?.name ?? "Workspace"

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="inline-flex size-2 rounded-full bg-primary" />
        {activeWorkspaceName}
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-12 z-40 w-80 rounded-md border bg-popover p-4 text-sm shadow-lg">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Workflows</p>
          <div className="mt-2 space-y-2">
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Loading workflows…</p>
            ) : workflows.length > 0 ? (
              <ul className="space-y-1">
                {workflows.map((workflow) => (
                  <li
                    key={workflow.id}
                    className="rounded-md border border-border/60 px-3 py-2 text-sm text-foreground"
                  >
                    {workflow.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No workflows yet.</p>
            )}
          </div>
          <form className="mt-3 space-y-2 border-t pt-3" onSubmit={handleCreateWorkflow}>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Create workflow
            </label>
            <input
              type="text"
              value={newWorkflowName}
              onChange={(event) => setNewWorkflowName(event.target.value)}
              placeholder="Workflow name"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create workflow"}
            </button>
          </form>
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}


