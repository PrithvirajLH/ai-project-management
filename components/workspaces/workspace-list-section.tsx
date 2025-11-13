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
      <section className="space-y-2">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          {description ? <p className="text-xs text-muted-foreground/80">{description}</p> : null}
        </header>
        <p className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
          {emptyMessage}
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-2">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        {description ? <p className="text-xs text-muted-foreground/80">{description}</p> : null}
      </header>
      <ul className="space-y-1">
        {workspaces.map((workspace) => {
          const isActive = workspace.id === activeWorkspaceId
          return (
            <li key={workspace.id}>
              <button
                type="button"
                onClick={() => onSelect(workspace)}
                className={[
                  "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-foreground hover:border-primary/80",
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

