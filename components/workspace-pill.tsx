"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"

import { CreateWorkspaceForm } from "@/components/workspaces/create-workspace-form"
import { WorkspaceListSection } from "@/components/workspaces/workspace-list-section"
import { WorkspaceListItem } from "@/components/workspaces/types"
import { useWorkspaceCollections } from "@/hooks/use-workspace-collections"
import { fetcher } from "@/lib/fetcher"
import { type Board } from "@/lib/boards"
import { cn } from "@/lib/utils"

export function WorkspacePill() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse route segments from pathname
  const routeSegments = useMemo(() => {
    return pathname?.split("/").filter(Boolean) ?? []
  }, [pathname])

  const routeType = routeSegments[0]
  const routeId = routeSegments[1]

  // Initialize personal workspace from session
  const initialPersonalWorkspace = useMemo(() => {
    const personal = session?.personalWorkspace
    if (!personal) return null

    return {
      id: personal.id,
      name: personal.name,
      slug: personal.slug,
      role: "owner" as const,
      isPersonal: true,
      ownerId: session?.user?.id ?? personal.id,
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
  } = useWorkspaceCollections({ initialPersonalWorkspace })

  // Fetch board data when on a board route
  const boardId = routeType === "board" ? routeId : null
  const { data: boardData } = useQuery<{ board: Board }>({
    queryKey: ["board", boardId],
    queryFn: () => fetcher(`/api/boards/${boardId}`),
    enabled: !!boardId && !!session?.user?.id,
  })

  // Determine active workspace ID from current route
  const activeWorkspaceId = useMemo(() => {
    if (routeType === "workspace" && routeId) return routeId
    if (routeType === "board" && boardData?.board) return boardData.board.workspaceId
    return personalWorkspace?.id ?? null
  }, [routeType, routeId, boardData, personalWorkspace])

  // Get active workspace name
  const activeWorkspaceName =
    allWorkspaces.find((w) => w.id === activeWorkspaceId)?.name ??
    personalWorkspace?.name ??
    "Workspace"

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
      window.dispatchEvent(new CustomEvent("workspace-created", { detail: workspace }))
    },
    [refresh, router, upsertWorkspace]
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setIsOpen(nextOpen)
      if (nextOpen && !hasFetched) void refresh()
    },
    [hasFetched, refresh]
  )

  // Handle outside clicks and Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    window.addEventListener("pointerdown", handleClickOutside)
    window.addEventListener("keydown", handleEscape)

    return () => {
      window.removeEventListener("pointerdown", handleClickOutside)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  if (status === "loading") {
    return <div className="h-10 w-40 animate-pulse rounded-full bg-muted" />
  }

  if (!session?.user) return null

  const isActive = activeWorkspaceId !== null

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => handleOpenChange(!isOpen)}
        className={cn(
          "flex w-48 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          isActive
            ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/30 text-primary hover:from-primary/15 hover:via-primary/10 hover:border-primary/50 shadow-md"
            : "border-border bg-background hover:border-primary"
        )}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={cn(
          "inline-flex size-2 rounded-full transition-all duration-300",
          isActive ? "bg-primary shadow-sm" : "bg-primary"
        )} />
        <span className="truncate text-center">{activeWorkspaceName}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-40 w-80 rounded-lg border bg-popover p-3 text-sm shadow-lg">
          <header className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Workspaces
            </p>
          </header>

          {isLoading ? (
            <div className="py-4 text-center">
              <p className="text-xs text-muted-foreground">Loading…</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
              <WorkspaceListSection
                title="Personal"
                workspaces={collections.personal}
                activeWorkspaceId={activeWorkspaceId ?? undefined}
                onSelect={handleWorkspaceSelect}
              />
              <WorkspaceListSection
                title="Owned"
                workspaces={collections.owned}
                activeWorkspaceId={activeWorkspaceId ?? undefined}
                onSelect={handleWorkspaceSelect}
                emptyMessage="No workspaces"
              />
              <WorkspaceListSection
                title="Shared"
                workspaces={collections.shared}
                activeWorkspaceId={activeWorkspaceId ?? undefined}
                onSelect={handleWorkspaceSelect}
                emptyMessage="None"
              />
            </div>
          )}

          <div className="mt-3 border-t pt-3">
            <CreateWorkspaceForm onCreate={handleWorkspaceCreated} />
          </div>

          {error && (
            <button
              type="button"
              onClick={() => setError(null)}
              className="mt-2 w-full rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
            >
              {error}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
