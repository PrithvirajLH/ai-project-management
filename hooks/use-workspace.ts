"use client"

import { useEffect, useMemo, useRef } from "react"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"

import { useWorkspaceCollections } from "@/hooks/use-workspace-collections"
import type { WorkspaceListItem } from "@/components/workspaces/types"

export function useWorkspace() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const previousWorkspaceIdRef = useRef<string | null>(null)

  const initialPersonalWorkspace = useMemo<WorkspaceListItem | null>(() => {
    const personal = session?.personalWorkspace
    if (!personal) {
      return null
    }

    const userId = session?.user?.id ?? personal.id

    return {
      id: personal.id,
      name: personal.name,
      slug: personal.slug,
      role: "owner",
      isPersonal: true,
      ownerId: userId,
    }
  }, [session?.personalWorkspace, session?.user?.id])

  const { allWorkspaces, isLoading, refresh } = useWorkspaceCollections({
    initialPersonalWorkspace,
  })

  const activeWorkspaceId = useMemo(() => {
    if (!pathname) {
      return initialPersonalWorkspace?.id ?? null
    }

    const segments = pathname.split("/").filter(Boolean)
    if (segments[0] === "workspace" && segments[1]) {
      return segments[1]
    }

    return initialPersonalWorkspace?.id ?? null
  }, [initialPersonalWorkspace?.id, pathname])

  const workspace = useMemo(() => {
    // If we have an active workspace ID from pathname, only return it if found in allWorkspaces
    // Don't fall back to personal workspace to prevent icon flash
    if (activeWorkspaceId) {
      const found = allWorkspaces.find((item) => item.id === activeWorkspaceId)
      // Return found workspace or null (which will trigger skeleton via isLoaded check)
      return found ?? null
    }
    // If no active workspace ID, fall back to personal
    return initialPersonalWorkspace ?? null
  }, [activeWorkspaceId, allWorkspaces, initialPersonalWorkspace])

  // Refresh if workspace ID changes and workspace is not found
  useEffect(() => {
    if (
      activeWorkspaceId &&
      activeWorkspaceId !== previousWorkspaceIdRef.current &&
      !workspace &&
      !isLoading &&
      status !== "loading"
    ) {
      previousWorkspaceIdRef.current = activeWorkspaceId
      void refresh()
    }
  }, [activeWorkspaceId, workspace, isLoading, status, refresh])

  // Show skeleton if loading, session is loading, or if we have an active workspace ID but can't find it yet
  const isLoaded = status !== "loading" && !isLoading && (activeWorkspaceId === null || workspace !== null)

  return {
    workspace,
    isLoaded,
  }
}
