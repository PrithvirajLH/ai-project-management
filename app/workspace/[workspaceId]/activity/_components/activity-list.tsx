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
        <ol className="space-y-4 mt-4">
            {auditLogs.length === 0 && (
                <p className="text-sm text-center text-muted-foreground">
                    No activity found inside this workspace.
                </p>
            )}
            {auditLogs.map((log: AuditLog) => (
                <ActivityItem
                    key={log.id}
                    data={log}
                />
            ))}
        </ol>
    );
};

ActivityList.Skeleton = function ActivityListSkeleton() {
    return (
        <ol className="space-y-4 mt-4">
            <Skeleton className="h-14 w-[80%]" />
            <Skeleton className="h-14 w-[50%]" />
            <Skeleton className="h-14 w-[70%]" />
            <Skeleton className="h-14 w-[80%]" />
            <Skeleton className="h-14 w-[75%]" />
        </ol>
    )
}