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
      className="rounded-lg border border-border/60 bg-card/50 last:border-b transition-all duration-200 hover:border-border hover:shadow-sm hover:shadow-border/20"
    >
      <AccordionTrigger
        onClick={onToggle}
        className={cn(
          "px-4 py-3 text-sm font-medium text-foreground transition-all duration-200 no-underline hover:no-underline rounded-lg group",
          isActive && !isExpanded 
            ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm" 
            : "hover:bg-muted/50"
        )}
      >
        <div className="flex w-full items-center gap-2.5">
          <span className="truncate flex-1 text-left font-medium transition-colors group-hover:text-foreground">{workspace.name}</span>
          <WorkspaceBadge workspace={workspace} />
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-0.5 pt-1.5 pb-2.5 px-1.5">
        {routes.map((route) => {
          const isRouteActive = pathname === route.href
          return (
            <Button
              key={route.href}
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => handleNavigate(route.href)}
              className={cn(
                "flex w-full items-center justify-start gap-2.5 pl-9 pr-3 py-2.5 text-left font-normal rounded-md transition-all duration-200 relative group/route",
                isRouteActive 
                  ? "bg-primary/10 text-primary hover:bg-primary/15 font-medium shadow-sm" 
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn("transition-all duration-200", isRouteActive && "text-primary scale-110")}>
                {route.icon}
              </span>
              <span>{route.label}</span>
            </Button>
          )
        })}
      </AccordionContent>
    </AccordionItem>
  )
}
