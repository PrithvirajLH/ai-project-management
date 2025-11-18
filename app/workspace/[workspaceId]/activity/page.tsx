import { Info } from "@/components/info";
import { Separator } from "@/components/ui/separator";
import { ActivityList } from "./_components/activity-list";
import { Suspense } from "react";

interface ActivityPageProps {
  params: Promise<{ workspaceId: string }>;
}

const ActivityPage = async ({ params }: ActivityPageProps) => {
  const { workspaceId } = await params;

  return (
    <div className="w-full">
      <Info/>
      <Separator className="my-2"/>
      <Suspense fallback={<ActivityList.Skeleton/>}>
        <ActivityList workspaceId={workspaceId}/>
      </Suspense>
    </div>
  )
}

export default ActivityPage;