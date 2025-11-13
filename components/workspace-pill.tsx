"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { CreateWorkspaceForm } from "@/components/workspaces/create-workspace-form"
import { WorkspaceListSection } from "@/components/workspaces/workspace-list-section"
import { WorkspaceListItem } from "@/components/workspaces/types"

type WorkspaceCollections = {
  personal: WorkspaceListItem[]
  owned: WorkspaceListItem[]
  shared: WorkspaceListItem[]
}

type WorkspacesResponse = {
  personalWorkspace: {
    id: string
    name: string
    slug: string
  }
  workspaces: WorkspaceCollections
}

function mergeWorkspaceCollections(
  current: WorkspaceCollections | null,
  updates: Partial<WorkspaceCollections>,
  fallbackPersonal: WorkspaceListItem[]
): WorkspaceCollections {
  return {
    personal: updates.personal ?? current?.personal ?? fallbackPersonal,
    owned: updates.owned ?? current?.owned ?? [],
    shared: updates.shared ?? current?.shared ?? [],
  }
}

export function WorkspacePill() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceCollections | null>(null)
  const hasFetchedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fallbackPersonalWorkspace: WorkspaceListItem[] = useMemo(() => {
    if (!session?.personalWorkspace) {
      return []
    }

    return [
      {
        id: session.personalWorkspace.id,
        name: session.personalWorkspace.name,
        slug: session.personalWorkspace.slug,
        role: "owner",
        isPersonal: true,
        ownerId: session.user?.id ?? session.personalWorkspace.id,
      },
    ]
  }, [session?.personalWorkspace, session?.user?.id])

  const activeWorkspaceId = useMemo(() => {
    if (!pathname) {
      return fallbackPersonalWorkspace[0]?.id ?? null
    }

    const segments = pathname.split("/").filter(Boolean)
    if (segments[0] === "workspace" && segments[1]) {
      return segments[1]
    }

    return fallbackPersonalWorkspace[0]?.id ?? null
  }, [fallbackPersonalWorkspace, pathname])

  const loadWorkspaces = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/workspaces", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
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
        throw new Error(message ?? "Failed to load workspaces.")
      }

      const data = payload as WorkspacesResponse | null

      if (!data) {
        throw new Error("Invalid response from server.")
      }

      setWorkspaces((prev) =>
        mergeWorkspaceCollections(
          prev,
          {
            personal: data.workspaces.personal,
            owned: data.workspaces.owned,
            shared: data.workspaces.shared,
          },
          fallbackPersonalWorkspace
        )
      )
      hasFetchedRef.current = true
    } catch (err) {
      console.error(err)
      setError("Could not load workspaces.")
    } finally {
      setIsLoading(false)
    }
  }, [fallbackPersonalWorkspace])

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
    if (!hasFetchedRef.current) {
      void loadWorkspaces()
    }
  }, [loadWorkspaces])

  useEffect(() => {
    if (isOpen && !hasFetchedRef.current) {
      void loadWorkspaces()
    }
  }, [isOpen, loadWorkspaces])

  const allWorkspaces = useMemo(() => {
    const collections = mergeWorkspaceCollections(workspaces, {}, fallbackPersonalWorkspace)
    return [...collections.personal, ...collections.owned, ...collections.shared]
  }, [fallbackPersonalWorkspace, workspaces])

  const activeWorkspaceName = useMemo(() => {
    const active = allWorkspaces.find((workspace) => workspace.id === activeWorkspaceId)
    if (active) {
      return active.name
    }
    return session?.personalWorkspace?.name ?? "Workspace"
  }, [activeWorkspaceId, allWorkspaces, session?.personalWorkspace?.name])

  const handleWorkspaceSelect = useCallback(
    (workspace: WorkspaceListItem) => {
      if (workspace.id === activeWorkspaceId) {
        setIsOpen(false)
        return
      }

      setIsOpen(false)
      router.push(`/workspace/${workspace.id}`)
    },
    [activeWorkspaceId, router]
  )

  const handleWorkspaceCreated = useCallback(
    (workspace: WorkspaceListItem) => {
      setWorkspaces((prev) =>
        mergeWorkspaceCollections(
          prev,
          {
            owned: [...(prev?.owned ?? []), workspace],
          },
          fallbackPersonalWorkspace
        )
      )
      setIsOpen(false)
      router.push(`/workspace/${workspace.id}`)
    },
    [fallbackPersonalWorkspace, router]
  )

  if (status === "loading") {
    return <div className="h-10 w-40 animate-pulse rounded-full bg-muted" />
  }

  if (!session?.user) {
    return null
  }

  const collections = mergeWorkspaceCollections(workspaces, {}, fallbackPersonalWorkspace)

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
        <span className="max-w-[10rem] truncate text-left sm:max-w-[14rem]">{activeWorkspaceName}</span>
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-12 z-40 w-80 space-y-4 rounded-md border bg-popover p-4 text-sm shadow-lg">
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Switch workspace
            </p>
            <p className="text-xs text-muted-foreground">
              Choose a workspace to jump right in. Personal workspace is private to you.
            </p>
          </header>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading workspaces…</p>
          ) : (
            <div className="space-y-3">
              <WorkspaceListSection
                title="Personal"
                workspaces={collections.personal}
                activeWorkspaceId={activeWorkspaceId ?? undefined}
                onSelect={handleWorkspaceSelect}
              />
              <WorkspaceListSection
                title="Owned"
                description="Workspaces you created."
                workspaces={collections.owned}
                activeWorkspaceId={activeWorkspaceId ?? undefined}
                onSelect={handleWorkspaceSelect}
                emptyMessage="Create a workspace to collaborate."
              />
              <WorkspaceListSection
                title="Shared"
                description="Invites from other owners."
                workspaces={collections.shared}
                activeWorkspaceId={activeWorkspaceId ?? undefined}
                onSelect={handleWorkspaceSelect}
                emptyMessage="No shared workspaces yet."
              />
            </div>
          )}
          <CreateWorkspaceForm onCreate={handleWorkspaceCreated} />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
