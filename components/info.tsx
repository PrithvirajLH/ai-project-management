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
        <div className="flex items-center">
            <WorkspaceIcon
                isPersonal={workspace.isPersonal}
                role={workspace.role}
                size={60}
            />
            <div className="space-y-1">
                <p className="font-semibold text-xl">{workspace.name}</p>
            </div>
            
        </div>
    );
}

Info.Skeleton = function SkeletonInfo() {
    return (
        <div className="flex items-center gap-x-4">
            <div className="w-[60px] h-[60px] relative">
                <Skeleton className="w-full h-full absolute" />
            </div>    
            <div className="space-y-2">
                <Skeleton className="h-10 w-[200px]" />
                <div className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2" />
                    <Skeleton className="h-4 w-[100px]" />
                </div>
            </div>
        </div>
    );
}