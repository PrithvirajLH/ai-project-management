import { listAuditLogs } from "@/lib/create-audit-log";
import { ActivityItem } from "@/components/activity-item";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditLog } from "@/types";

interface ActivityListProps {
    workspaceId: string;
}

export const ActivityList = async ({ workspaceId }: ActivityListProps) => {
    const auditLogs = await listAuditLogs(workspaceId);

    const hasActivity = auditLogs.length > 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2.5">
                <h2 className="font-semibold text-lg text-foreground">Activity</h2>
            </div>
            {!hasActivity && (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        No activity found inside this workspace.
                    </p>
                </div>
            )}
            {hasActivity && (
                <div className="relative pl-10">
                    <span
                        className="pointer-events-none absolute left-4 top-0 h-full w-px bg-border/40"
                        aria-hidden
                    />
                    <ol className="space-y-6">
                        {auditLogs.map((log: AuditLog, index: number) => (
                            <ActivityItem
                                key={log.id}
                                data={log}
                                showConnector={index !== auditLogs.length - 1}
                            />
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
};

ActivityList.Skeleton = function ActivityListSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2.5">
                <Skeleton className="h-6 w-24 rounded" />
            </div>
            <div className="relative pl-10">
                <span className="absolute left-4 top-0 h-full w-px bg-border/40" />
                <ol className="space-y-4">
                    <Skeleton className="h-20 w-full rounded-lg" />
                    <Skeleton className="h-20 w-full rounded-lg" />
                    <Skeleton className="h-20 w-full rounded-lg" />
                </ol>
            </div>
        </div>
    )
}