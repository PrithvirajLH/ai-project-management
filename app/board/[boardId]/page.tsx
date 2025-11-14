import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface BoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  return (
    <div>
      <h1>Board Page</h1>
    </div>
  );

}

