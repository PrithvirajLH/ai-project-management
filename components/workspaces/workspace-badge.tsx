import { WorkspaceListItem } from "@/components/workspaces/types"

type WorkspaceBadgeVariant = "personal" | "owner" | "member"

function getVariant(workspace: Pick<WorkspaceListItem, "isPersonal" | "role">): WorkspaceBadgeVariant {
  if (workspace.isPersonal) return "personal"
  return workspace.role === "owner" ? "owner" : "member"
}

function badgeClasses(variant: WorkspaceBadgeVariant) {
  switch (variant) {
    case "personal":
      return "bg-blue-100 text-blue-700 border-blue-200"
    case "owner":
      return "bg-emerald-100 text-emerald-700 border-emerald-200"
    case "member":
    default:
      return "bg-amber-100 text-amber-700 border-amber-200"
  }
}

type WorkspaceBadgeProps = {
  variant?: WorkspaceBadgeVariant
  workspace?: Pick<WorkspaceListItem, "isPersonal" | "role">
}

const LABELS: Record<WorkspaceBadgeVariant, string> = {
  personal: "Personal",
  owner: "Owner",
  member: "Member",
}

export function WorkspaceBadge({ variant, workspace }: WorkspaceBadgeProps) {
  const resolvedVariant = variant ?? (workspace ? getVariant(workspace) : "member")
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        badgeClasses(resolvedVariant),
      ].join(" ")}
    >
      {LABELS[resolvedVariant]}
    </span>
  )
}

