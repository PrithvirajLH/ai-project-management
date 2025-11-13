"use client";

import Link from "next/link"
import { useCallback, useMemo } from "react"
import { Plus } from "lucide-react"
import { useLocalStorage } from "usehooks-ts"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Accordion } from "@/components/ui/accordion"
import { NavItem } from "@/components/nav-item"
import { useWorkspaceCollections } from "@/hooks/use-workspace-collections"

interface SidebarProps {
  storageKey: string
}

export const Sidebar = ({
  storageKey = "t=workspace-sidebar-state",
}: SidebarProps) => {
  const pathname = usePathname()
  const { data: session } = useSession()

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

  const { allWorkspaces, personalWorkspace } = useWorkspaceCollections({
    initialPersonalWorkspace,
  })

  const [expandedState, setExpandedState] = useLocalStorage<Record<string, boolean>>(
    storageKey,
    {}
  )

  const isHydrated = typeof window !== "undefined"

  const activeWorkspaceId = useMemo(() => {
    if (!pathname) {
      return personalWorkspace?.id ?? null
    }

    const segments = pathname.split("/").filter(Boolean)
    if (segments[0] === "workspace" && segments[1]) {
      return segments[1]
    }

    return personalWorkspace?.id ?? null
  }, [pathname, personalWorkspace?.id])

  const expandedValues = useMemo(() => {
    const entries = Object.entries(expandedState)
    const openIds = entries.filter(([, isOpen]) => isOpen).map(([id]) => id)
    return openIds
  }, [expandedState])

  const defaultValues = useMemo(
    () => (activeWorkspaceId ? [activeWorkspaceId] : []),
    [activeWorkspaceId]
  )

  const hydrateExpandedState = useCallback(
    (values: string[]) => {
      if (values.length === 0) {
        return
      }

      const openSet = new Set(values)
      setExpandedState((current) => {
        const next: Record<string, boolean> = {}
        const ids = new Set([
          ...Object.keys(current),
          ...allWorkspaces.map((workspace) => workspace.id),
        ])

        ids.forEach((id) => {
          next[id] = openSet.has(id)
        })

        return next
      })
    },
    [allWorkspaces, setExpandedState]
  )

  const handleHeadlessToggle = useCallback(
    (workspaceId: string) => {
      setExpandedState((current) => {
        const next = { ...current }
        next[workspaceId] = !next[workspaceId]
        return next
      })
    },
    [setExpandedState]
  )

  if (!allWorkspaces.length) {
    return null
  }

  return (
    <aside className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>Workspaces</span>
        <Button asChild type="button" size="icon" variant="ghost" className="ml-auto">
          <Link href="/">
            {/* TODO: add new workspace page */}
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      {isHydrated ? (
        <Accordion
          type="multiple"
          value={expandedValues}
          onValueChange={hydrateExpandedState}
          className="space-y-1"
        >
          {allWorkspaces.map((workspace) => (
            <NavItem
              key={workspace.id}
              workspace={workspace}
              isActive={workspace.id === activeWorkspaceId}
              isExpanded={expandedValues.includes(workspace.id)}
              onToggle={() => handleHeadlessToggle(workspace.id)}
            />
          ))}
        </Accordion>
      ) : (
        <div className="space-y-1">
          {allWorkspaces.map((workspace) => (
            <NavItem
              key={workspace.id}
              workspace={workspace}
              isActive={workspace.id === activeWorkspaceId}
              isExpanded={defaultValues.includes(workspace.id)}
            />
          ))}
        </div>
      )}
    </aside>
  )
}