"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { CreateWorkspaceForm } from "@/components/workspaces/create-workspace-form"
import { WorkspaceListSection } from "@/components/workspaces/workspace-list-section"
import { WorkspaceListItem } from "@/components/workspaces/types"
import { useWorkspaceCollections } from "@/hooks/use-workspace-collections"
import { cn } from "@/lib/utils"

export function WorkspacePill() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const initialPersonalWorkspace = useMemo(() => {
    const personal = session?.personalWorkspace
    if (!personal) {
      return null
    }

    const userId = session?.user?.id ?? personal.id

    return {
      id: personal.id,
      name: personal.name,
      slug: personal.slug,
      role: "owner" as const,
      isPersonal: true,
      ownerId: userId,
    }
  }, [session?.personalWorkspace, session?.user?.id])

  const {
    collections,
    allWorkspaces,
    personalWorkspace,
    isLoading,
    error,
    hasFetched,
    refresh,
    upsertWorkspace,
    setError,
  } = useWorkspaceCollections({
    initialPersonalWorkspace,
  })

  const activeWorkspaceId = useMemo(() => {
    if (!pathname) {
      return personalWorkspace?.id ?? null
    }

    const segments = pathname.split("/").filter(Boolean)
    if (segments[0] === "workspace" && segments[1]) {
      return segments[1]
    }

    return personalWorkspace?.id ?? null
  }, [personalWorkspace, pathname])

  const activeWorkspaceName = useMemo(() => {
    const active = allWorkspaces.find((workspace) => workspace.id === activeWorkspaceId)
    if (active) {
      return active.name
    }
    return personalWorkspace?.name ?? "Workspace"
  }, [activeWorkspaceId, allWorkspaces, personalWorkspace?.name])

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
      upsertWorkspace(workspace)
      setIsOpen(false)
      router.push(`/workspace/${workspace.id}`)
      void refresh()
      // Dispatch event to notify other components (like sidebar) to refresh
      window.dispatchEvent(new CustomEvent("workspace-created", { detail: workspace }))
    },
    [refresh, router, upsertWorkspace]
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setIsOpen(nextOpen)
      if (nextOpen && !hasFetched) {
        void refresh()
      }
    },
    [hasFetched, refresh]
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        handleOpenChange(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleOpenChange(false)
      }
    }

    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleOpenChange, isOpen])

  if (status === "loading") {
    return <div className="h-10 w-40 animate-pulse rounded-full bg-muted" />
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => handleOpenChange(!isOpen)}
        className="flex w-48 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="inline-flex size-2 rounded-full bg-primary" />
        <span className="truncate text-center">{activeWorkspaceName}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen ? "rotate-180" : "rotate-0"
          )}
        />
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
          {error ? (
            <button
              type="button"
              onClick={() => setError(null)}
              className="w-full rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
            >
              {error}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
