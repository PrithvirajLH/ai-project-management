import { listAuditLogs } from "@/lib/create-audit-log";
import { ActivityItem } from "@/components/activity-item";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditLog } from "@/types";

interface ActivityListProps {
    workspaceId: string;
}

export const ActivityList = async ({ workspaceId }: ActivityListProps) => {
    const auditLogs = await listAuditLogs(workspaceId);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2.5">
                <h2 className="font-semibold text-lg text-foreground">Activity</h2>
            </div>
            <ol className="space-y-3">
                {auditLogs.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center">
                        <p className="text-sm text-muted-foreground">
                            No activity found inside this workspace.
                        </p>
                    </div>
                )}
                {auditLogs.map((log: AuditLog) => (
                    <ActivityItem
                        key={log.id}
                        data={log}
                    />
                ))}
            </ol>
        </div>
    );
};

ActivityList.Skeleton = function ActivityListSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2.5">
                <Skeleton className="h-6 w-24 rounded" />
            </div>
            <ol className="space-y-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
            </ol>
        </div>
    )
}