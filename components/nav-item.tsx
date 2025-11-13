"use client"

import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Activity, Layout, Settings } from "lucide-react"

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { WorkspaceBadge } from "@/components/workspaces/workspace-badge"
import { WorkspaceListItem } from "@/components/workspaces/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type NavItemProps = {
  workspace: WorkspaceListItem
  isActive?: boolean
  isExpanded?: boolean
  onToggle?: () => void
}

export function NavItem({
  workspace,
  isActive = false,
  isExpanded = false,
  onToggle,
}: NavItemProps) {
  const router = useRouter()
  const pathname = usePathname()

  const routes = useMemo(
    () => [
      {
        label: "Board",
        href: `/workspace/${workspace.id}`,
        icon: <Layout className="mr-2 h-4 w-4" />,
      },
      {
        label: "Activity",
        href: `/workspace/${workspace.id}/activity`,
        icon: <Activity className="mr-2 h-4 w-4" />,
      },
      {
        label: "Settings",
        href: `/workspace/${workspace.id}/settings`,
        icon: <Settings className="mr-2 h-4 w-4" />,
      },
    ],
    [workspace.id]
  )

  function handleNavigate(href: string) {
    router.push(href)
  }

  return (
    <AccordionItem
      value={workspace.id}
      data-expanded={isExpanded ? "" : undefined}
      className="rounded-lg border border-border/40 bg-card/40"
    >
      <AccordionTrigger
        onClick={onToggle}
        className={cn(
          "px-4 py-2 text-sm font-medium text-foreground transition",
          isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
        )}
      >
        <div className="flex w-full items-center gap-2">
          <span className="truncate">{workspace.name}</span>
          <WorkspaceBadge workspace={workspace} />
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-1 pt-1">
        {routes.map((route) => (
          <Button
            key={route.href}
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => handleNavigate(route.href)}
            className={cn(
              "flex w-full items-center justify-start gap-2 pl-10 text-left font-normal",
              pathname === route.href && "bg-sky-500/10 text-sky-700"
            )}
          >
            {route.icon}
            {route.label}
          </Button>
        ))}
      </AccordionContent>
    </AccordionItem>
  )
}
