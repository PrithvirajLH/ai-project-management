"use client"

import { WorkspaceListItem } from "@/components/workspaces/types"
import { WorkspaceBadge } from "@/components/workspaces/workspace-badge"

type WorkspaceListSectionProps = {
  title: string
  description?: string
  workspaces: WorkspaceListItem[]
  activeWorkspaceId?: string
  onSelect: (workspace: WorkspaceListItem) => void
  emptyMessage?: string
}

export function WorkspaceListSection({
  title,
  description,
  workspaces,
  activeWorkspaceId,
  onSelect,
  emptyMessage = "No workspaces",
}: WorkspaceListSectionProps) {
  if (workspaces.length === 0) {
    return (
      <section className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="rounded-md border border-dashed border-border/40 px-2.5 py-1.5 text-xs text-muted-foreground/70">
          {emptyMessage}
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-1">
        {workspaces.map((workspace) => {
          const isActive = workspace.id === activeWorkspaceId
          return (
            <li key={workspace.id}>
              <button
                type="button"
                onClick={() => onSelect(workspace)}
                className={[
                  "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted/50",
                ].join(" ")}
              >
                <span className="truncate">{workspace.name}</span>
                <WorkspaceBadge workspace={workspace} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

