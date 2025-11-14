import { BoardList } from "@/components/board-list";
import { Info } from "@/components/info";
import { Separator } from "@/components/ui/separator";

const WorkspaceIDPage = async () => {
  return (
    <div className="w-full mb-10">
      <Info/>
      <Separator className="my-2" />
      <div className="px-2 md:px-4">
        <BoardList />
      </div>
    </div>
  );
};

export default WorkspaceIDPage;