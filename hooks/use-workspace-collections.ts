import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { WorkspaceListItem } from "@/components/workspaces/types"

type WorkspaceCollections = {
  personal: WorkspaceListItem[]
  owned: WorkspaceListItem[]
  shared: WorkspaceListItem[]
}

type WorkspacesApiResponse = {
  personalWorkspace: {
    id: string
    name: string
    slug: string
    ownerId: string
    isPersonal: boolean
    createdAt: string
    updatedAt: string
  }
  workspaces: WorkspaceCollections
}

type UseWorkspaceCollectionsOptions = {
  initialPersonalWorkspace?: WorkspaceListItem | null
}

function createWorkspaceListItem(input: WorkspaceListItem): WorkspaceListItem {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    role: input.role,
    isPersonal: input.isPersonal,
    ownerId: input.ownerId,
  }
}

function normalizeWorkspace(input: {
  id: string
  name: string
  slug: string
  role: "owner" | "member"
  isPersonal: boolean
  ownerId: string
}): WorkspaceListItem {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    role: input.role,
    isPersonal: input.isPersonal,
    ownerId: input.ownerId,
  }
}

const emptyCollections: WorkspaceCollections = {
  personal: [],
  owned: [],
  shared: [],
}

function mergeWorkspaceIntoCollections(
  collections: WorkspaceCollections,
  workspace: WorkspaceListItem
): WorkspaceCollections {
  const next: WorkspaceCollections = {
    personal: collections.personal.filter((item) => item.id !== workspace.id),
    owned: collections.owned.filter((item) => item.id !== workspace.id),
    shared: collections.shared.filter((item) => item.id !== workspace.id),
  }

  if (workspace.isPersonal) {
    next.personal = [workspace, ...next.personal]
  } else if (workspace.role === "owner") {
    next.owned = [...next.owned, workspace]
  } else {
    next.shared = [...next.shared, workspace]
  }

  return next
}

export function useWorkspaceCollections(
  options: UseWorkspaceCollectionsOptions = {}
) {
  const { initialPersonalWorkspace = null } = options
  const [collections, setCollections] = useState<WorkspaceCollections>(() => {
    if (initialPersonalWorkspace) {
      return mergeWorkspaceIntoCollections(emptyCollections, initialPersonalWorkspace)
    }
    return emptyCollections
  })
  const [personalWorkspace, setPersonalWorkspace] = useState<WorkspaceListItem | null>(
    initialPersonalWorkspace ? createWorkspaceListItem(initialPersonalWorkspace) : null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!initialPersonalWorkspace) {
      return
    }

    setCollections((prev) => mergeWorkspaceIntoCollections(prev, initialPersonalWorkspace))
    setPersonalWorkspace(createWorkspaceListItem(initialPersonalWorkspace))
  }, [initialPersonalWorkspace])

  const mapCollections = useCallback((data: WorkspaceCollections) => {
    return {
      personal: data.personal.map(normalizeWorkspace),
      owned: data.owned.map(normalizeWorkspace),
      shared: data.shared.map(normalizeWorkspace),
    }
  }, [])

  const refresh = useCallback(async () => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/workspaces", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
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

      const data = payload as WorkspacesApiResponse | null

      if (!data) {
        throw new Error("Invalid response from server.")
      }

      const normalizedCollections = mapCollections(data.workspaces)
      const personal = normalizeWorkspace({
        id: data.personalWorkspace.id,
        name: data.personalWorkspace.name,
        slug: data.personalWorkspace.slug,
        role: "owner",
        isPersonal: data.personalWorkspace.isPersonal,
        ownerId: data.personalWorkspace.ownerId,
      })

      setCollections(normalizedCollections)
      setPersonalWorkspace(personal)
      setHasFetched(true)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return
      }
      console.error(err)
      setError(err instanceof Error ? err.message : "Failed to load workspaces.")
    } finally {
      setIsLoading(false)
    }
  }, [mapCollections])

  useEffect(() => {
    if (!hasFetched) {
      void refresh()
    }

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [hasFetched, refresh])

  const allWorkspaces = useMemo(() => {
    return [
      ...collections.personal,
      ...collections.owned,
      ...collections.shared,
    ]
  }, [collections])

  const upsertWorkspace = useCallback((workspace: WorkspaceListItem) => {
    setCollections((prev) => mergeWorkspaceIntoCollections(prev, workspace))
    if (workspace.isPersonal) {
      setPersonalWorkspace(createWorkspaceListItem(workspace))
    }
  }, [])

  return {
    collections,
    allWorkspaces,
    personalWorkspace,
    isLoading,
    error,
    hasFetched,
    refresh,
    upsertWorkspace,
    setError,
  }
}

