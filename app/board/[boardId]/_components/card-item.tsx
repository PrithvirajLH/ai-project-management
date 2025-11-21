"use client";

import { useCardModal } from "@/hooks/use-card-modal";
import { Card } from "@/lib/cards";
import { Draggable } from "@hello-pangea/dnd";

interface CardItemProps {
    data: Card;
    index: number;
}

export const CardItem = ({ data, index }: CardItemProps) => {
    const cardModal = useCardModal();
    return (
        <Draggable draggableId={data.id} index={index}>
            {(provided) => (
                <div 
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                ref={provided.innerRef}
                role="button"
                onClick={() => cardModal.onOpen(data.id)}
                className="truncate border-2 border-transparent hover:border-primary/30 py-2.5 px-3 text-sm bg-white rounded-md shadow-sm hover:shadow-md hover:shadow-primary/5 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0">
                        {data.title}
                </div>
                )}
        </Draggable>
    )
}
