"use client";

import { CardWithList } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface DescriptionProps {
    data: CardWithList;
}

export const Description = ({
    data,
}: DescriptionProps) => {
    return (
        <div>
            {data.description}
        </div>
    )
};

Description.Skeleton = function DescriptionSkeleton() {
    return (
        <div className="flex items-center gap-x-3 w-full">
            <Skeleton className="h-6 w-6 bg-neutral-200"/>
            <div className="w-full">
                <Skeleton className="h-6 w-24 mb-2 bg-neutral-200"/>
                <Skeleton className="h-[78px] w-full  bg-neutral-200"/>
            </div>
        </div>
    )
};