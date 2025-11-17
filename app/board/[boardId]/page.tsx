import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listLists } from "@/lib/lists";
import { listCards } from "@/lib/cards";
import { ListContainer } from "./_components/list-container";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const { boardId } = await params;
  
  // Get all lists for this board (already sorted by order)
  const lists = await listLists(boardId);
  
  // Get cards for each list
  const listsWithCards = await Promise.all(
    lists.map(async (list) => {
      const cards = await listCards(list.id);
      return {
        ...list,
        cards,
      };
    })
  );

  return (
    <div className="p-4 h-full overflow-x-auto">
      <ListContainer
        boardId={boardId}
        data={listsWithCards}
      />
    </div>
  );
}

