"use client";

import { HelpCircle, User2, ArrowUpDown, ListTodo } from "lucide-react";
import { Hint } from "@/components/hint";
import { FormPopover } from "@/components/forms/form-popover";
import { useWorkspace } from "@/hooks/use-workspace";
import { useEffect, useState, useRef } from "react";
import type { BoardWithTodoCount } from "@/lib/boards";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

type SortOption = "default" | "todos-desc" | "todos-asc";

export const BoardList = () => {
    const { workspace, isLoaded } = useWorkspace();
    const { status: sessionStatus } = useSession();
    const [boards, setBoards] = useState<BoardWithTodoCount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState<SortOption>("todos-desc");
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef<number>(0);

    useEffect(() => {
        // Reset retry count when workspace changes
        retryCountRef.current = 0;
        
        // Don't fetch if session is not authenticated or workspace is not loaded
        if (!workspace || !isLoaded || sessionStatus !== "authenticated") {
            if (sessionStatus === "unauthenticated") {
                setIsLoading(false);
            }
            return;
        }

        const fetchBoards = async () => {
            try {
                const response = await fetch(`/api/boards?workspaceId=${workspace.id}&includeTodoCounts=true`);
                if (!response.ok) {
                    if (response.status === 403 && retryCountRef.current < 3) {
                        // 403 might mean membership not yet established, retry after a delay
                        retryCountRef.current += 1;
                        console.warn(`Access denied, retrying (${retryCountRef.current}/3) in 1 second...`);
                        retryTimeoutRef.current = setTimeout(() => {
                            fetchBoards();
                        }, 1000);
                        return;
                    }
                    // Reset retry count on success or max retries
                    retryCountRef.current = 0;
                    throw new Error(`Failed to fetch boards: ${response.status}`);
                }
                // Reset retry count on success
                retryCountRef.current = 0;
                const data = await response.json();
                setBoards(data.boards || []);
                setIsLoading(false);
            } catch (error) {
                console.error("Failed to fetch boards:", error);
                setIsLoading(false);
            }
        };

        fetchBoards();

        // Listen for board creation events to refresh
        const handleBoardCreated = () => {
            fetchBoards();
        };

        window.addEventListener("board-created", handleBoardCreated);
        return () => {
            window.removeEventListener("board-created", handleBoardCreated);
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [workspace?.id, isLoaded, sessionStatus]);

    // Sort boards based on selected sort option
    const sortedBoards = [...boards].sort((a, b) => {
        switch (sortBy) {
            case "todos-desc":
                return (b.todoCount ?? 0) - (a.todoCount ?? 0);
            case "todos-asc":
                return (a.todoCount ?? 0) - (b.todoCount ?? 0);
            case "default":
            default:
                // Handle createdAt as either Date object or string (from JSON serialization)
                const aTime = a.createdAt instanceof Date 
                    ? a.createdAt.getTime() 
                    : new Date(a.createdAt).getTime();
                const bTime = b.createdAt instanceof Date 
                    ? b.createdAt.getTime() 
                    : new Date(b.createdAt).getTime();
                return aTime - bTime;
        }
    });

    const handleSortChange = () => {
        const sortOptions: SortOption[] = ["todos-desc", "todos-asc", "default"];
        const currentIndex = sortOptions.indexOf(sortBy);
        const nextIndex = (currentIndex + 1) % sortOptions.length;
        setSortBy(sortOptions[nextIndex]);
    };

    const getSortLabel = () => {
        switch (sortBy) {
            case "todos-desc":
                return "Most Todos";
            case "todos-asc":
                return "Least Todos";
            case "default":
            default:
                return "Default";
        }
    };

    if (!isLoaded || isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-6 w-32 rounded" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <Skeleton className="aspect-video rounded-lg" />
                    <Skeleton className="aspect-video rounded-lg" />
                    <Skeleton className="aspect-video rounded-lg" />
                    <Skeleton className="aspect-video rounded-lg" />
                    <Skeleton className="aspect-video rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <User2 className="h-5 w-5 text-muted-foreground" />
                    <h2 className="font-semibold text-lg text-foreground">Your Boards</h2>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSortChange}
                    className="gap-2"
                >
                    <ArrowUpDown className="h-4 w-4" />
                    <span className="hidden sm:inline">Sort: {getSortLabel()}</span>
                    <span className="sm:hidden">{getSortLabel()}</span>
                </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedBoards.map((board) => (
                    <Link
                        key={board.id}
                        href={`/board/${board.id}`}
                        style={{ backgroundImage: `url(${board.imageThumbUrl})` }}
                        className="group relative aspect-video bg-no-repeat bg-center bg-cover
                        h-full w-full overflow-hidden rounded-lg bg-sky-700 p-3 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-black/20 hover:scale-[1.02] hover:-translate-y-1 active:scale-[1] active:translate-y-0"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent group-hover:from-black/60 group-hover:via-black/30 transition-all duration-300 rounded-lg">
                            <div className="relative pt-1 pl-2 pr-2 flex items-start justify-between gap-2">
                                <p className="font-semibold text-white text-md leading-tight line-clamp-2 drop-shadow-sm flex-1">
                                    {board.title}
                                </p>
                                {(board.todoCount ?? 0) > 0 && (
                                    <div className="flex-shrink-0 flex items-center gap-1 bg-primary/90 text-primary-foreground px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm">
                                        <ListTodo className="h-3 w-3" />
                                        <span>{board.todoCount}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
                <FormPopover side="right" sideOffset={10}>
                    <div
                        role="button"
                        className="aspect-video relative h-full w-full bg-muted/50 rounded-lg flex flex-col gap-y-2 items-center justify-center hover:bg-muted/70 transition-all duration-200 border-2 border-dashed border-border/60 hover:border-border hover:border-solid shadow-sm hover:shadow-md group cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                            Create new board
                        </p>
                        <Hint sideOffset={40} description={`Create a new board in your workspace`}>
                            <HelpCircle className="absolute bottom-2 right-2 h-[14px] w-[14px] text-muted-foreground group-hover:text-foreground transition-colors duration-200"/>
                        </Hint>
                    </div> 
                </FormPopover>
            </div>
        </div>
    );
}