import { AuditLog } from "@/types"
import { generateLogMessage } from "@/lib/generate-log-message"
import { Action, EntityType } from "@/lib/create-audit-log"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { KanbanSquare, LayoutDashboard, Rows4, type LucideIcon } from "lucide-react"

function getInitials(name?: string | null) {
  if (!name) return "?"

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

const actionAccentMap: Record<Action, { dot: string; ring: string; badge: string }> = {
  [Action.CREATE]: {
    dot: "bg-emerald-500",
    ring: "ring-1 ring-emerald-500/35",
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  [Action.UPDATE]: {
    dot: "bg-sky-500",
    ring: "ring-1 ring-sky-500/35",
    badge: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  },
  [Action.DELETE]: {
    dot: "bg-rose-500",
    ring: "ring-1 ring-rose-500/35",
    badge: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  },
}

const entityAccentMap: Record<EntityType, { icon: LucideIcon; wrapper: string; label: string }> = {
  [EntityType.BOARD]: {
    icon: LayoutDashboard,
    wrapper: "border-sky-500/25 bg-sky-500/10 text-sky-600",
    label: "Board",
  },
  [EntityType.LIST]: {
    icon: Rows4,
    wrapper: "border-amber-500/25 bg-amber-500/10 text-amber-600",
    label: "List",
  },
  [EntityType.CARD]: {
    icon: KanbanSquare,
    wrapper: "border-violet-500/25 bg-violet-500/10 text-violet-600",
    label: "Card",
  },
}

interface ActivityItemProps {
  data: AuditLog
  showConnector?: boolean
}

export const ActivityItem = ({ data, showConnector = false }: ActivityItemProps) => {
  const actorBadgeText = data.isAgentAction ? "AI agent" : "Member"
  const actionType = (Object.values(Action) as string[]).includes(data.action)
    ? (data.action as Action)
    : Action.UPDATE
  const entityType = (Object.values(EntityType) as string[]).includes(data.entityType)
    ? (data.entityType as EntityType)
    : EntityType.CARD

  const actionAccent = actionAccentMap[actionType] ?? actionAccentMap[Action.UPDATE]
  const entityAccent = entityAccentMap[entityType] ?? entityAccentMap[EntityType.CARD]
  const EntityIcon = entityAccent.icon

  return (
    <li className="flex gap-4">
      <div className="flex w-8 flex-col items-center">
        <span className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-card timeline-dot shadow-sm">
          <span className={`h-2.5 w-2.5 rounded-full ${actionAccent.dot} shadow-sm`} />
        </span>
        {showConnector && <span className="mt-1 h-full w-px flex-1 bg-gradient-to-b from-border/40 via-border/30 to-transparent" />}
      </div>
      <div
        className={`flex flex-1 items-start gap-3 rounded-xl border border-border/40 glass-card p-4 shadow-md transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 card-hover ${actionAccent.ring}`}
      >
        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
          <AvatarImage src={data.userImage ?? undefined} />
          <AvatarFallback className="text-xs font-medium">{getInitials(data.username)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{data.username}</span>{" "}
              {generateLogMessage(data)}
            </p>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${actionAccent.badge}`}
            >
              {actionType.toLowerCase()}
            </span>
            <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {actorBadgeText}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${entityAccent.wrapper}`}
            >
              <EntityIcon className="h-3.5 w-3.5" />
              {entityAccent.label}
            </span>
            <span>{format(new Date(data.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
          </div>
        </div>
      </div>
    </li>
  )
}
