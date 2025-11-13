"use client";

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { useLocalStorage } from "usehooks-ts"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Accordion } from "@/components/ui/accordion"
import { NavItem } from "@/components/nav-item"
import { useWorkspaceCollections } from "@/hooks/use-workspace-collections"
import { Skeleton } from "@/components/ui/skeleton"

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

  const { allWorkspaces, personalWorkspace, isLoading } = useWorkspaceCollections({
    initialPersonalWorkspace,
  })

  const [expandedState, setExpandedState] = useLocalStorage<Record<string, boolean>>(
    storageKey,
    {}
  )

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

  const defaultValues: string[] = []

  const persistedValues = useMemo(() => {
    const entries = Object.entries(expandedState)
    const openIds = entries.filter(([, isOpen]) => isOpen).map(([id]) => id)
    return openIds
  }, [expandedState])

  const controlledValues = persistedValues.length ? persistedValues : defaultValues

  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsHydrated(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const accordionValues = isHydrated ? controlledValues : []

  const applyValues = (values: string[]) => {
    setExpandedState((current) => {
      const next: Record<string, boolean> = {}
      const ids = new Set([
        ...Object.keys(current),
        ...values,
      ])
      ids.forEach((id) => {
        next[id] = values.includes(id)
      })
      return next
    })
  }

  const handleValueChange = (values: string[]) => {
    applyValues(values)
  }

  const handleToggle = (workspaceId: string) => {
    if (controlledValues.includes(workspaceId)) {
      applyValues(controlledValues.filter((id) => id !== workspaceId))
    } else {
      applyValues([...controlledValues, workspaceId])
    }
  }

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
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <Accordion
          type="multiple"
          value={accordionValues}
          onValueChange={handleValueChange}
          className="space-y-1"
        >
          {allWorkspaces.map((workspace) => (
            <NavItem
              key={workspace.id}
              workspace={workspace}
              isActive={workspace.id === activeWorkspaceId}
              isExpanded={accordionValues.includes(workspace.id)}
              onToggle={() => handleToggle(workspace.id)}
            />
          ))}
        </Accordion>
      )}
    </aside>
  )
}