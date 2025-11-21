"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceIcon } from "@/components/workspaces/workspace-icon";

export const Info = () => {
    const { workspace, isLoaded } = useWorkspace();

    if (!isLoaded) {
        return (<Info.Skeleton />);
    }

    if (!workspace) {
        return null;
    }

    return (
        <div className="flex items-center gap-4">
            <WorkspaceIcon
                isPersonal={workspace.isPersonal}
                role={workspace.role}
                size={64}
            />
            <div className="space-y-1">
                <h1 className="font-bold text-2xl text-foreground">{workspace.name}</h1>
            </div>
        </div>
    );
}

Info.Skeleton = function SkeletonInfo() {
    return (
        <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-lg" />
            <div className="space-y-2">
                <Skeleton className="h-8 w-[200px] rounded" />
            </div>
        </div>
    );
}