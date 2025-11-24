"use client"

import { ListWithCards } from "@/types";
import { ListForm } from "./list-form";
import { useEffect, useState } from "react";
import { ListItem } from "./list-item";
import {DragDropContext, Droppable, Draggable} from "@hello-pangea/dnd";
import { updateListOrder } from "@/actions/update-list-order";
import { useAction } from "@/hooks/use-action";
import { toast } from "sonner";
import { updateCardOrder } from "@/actions/update-card-order";
import { useRouter, useParams } from "next/navigation";

interface ListContainerProps {
    data: ListWithCards[];
    boardId: string;
}

function reorder<T>(list: T[], startIndex: number, endIndex: number) {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

export const ListContainer = ({ 
    data,
    boardId,
}: ListContainerProps) => {
    const [orderedData, setOrderedData] = useState(data);
    const router = useRouter();
    const params = useParams();

    const {execute: executeUpdateListOrder} = useAction(updateListOrder, {
        onSuccess: (data) => {
            toast.success("List reordered");
            // Refresh the page to get updated data from server
            router.refresh();
        },
        onError: (error) => {
            toast.error(error);
        },
    });
    
    const {execute: executeUpdateCardOrder} = useAction(updateCardOrder, {
        onSuccess: (data) => {
            toast.success("Card reordered");
            // Refresh to ensure consistency across tabs
            router.refresh();
            // Broadcast to other tabs
            if (typeof window !== "undefined" && window.BroadcastChannel) {
                const channel = new BroadcastChannel("board-updates");
                channel.postMessage({ type: "card-moved", boardId });
                channel.close();
            }
        },
        onError: (error) => {
            toast.error(error);
        },
    });


    useEffect(() => {
        setOrderedData(data);
    }, [data]);

    // Listen for cross-tab updates
    useEffect(() => {
        if (typeof window === "undefined" || !window.BroadcastChannel) {
            return;
        }

        const channel = new BroadcastChannel("board-updates");
        
        channel.onmessage = (event) => {
            const message = event.data;
            // Only refresh if the message is for this board
            if (message.boardId === boardId || message.boardId === params.boardId) {
                // Refresh the page to get updated data
                router.refresh();
            }
        };

        return () => {
            channel.close();
        };
    }, [boardId, params.boardId, router]);

    const onDragEnd = (result: any) => {
        const {destination, source, type} = result;

        if(!destination) {return};

        if(destination.droppableId === source.droppableId && destination.index === source.index) {return};

        if(type === "list") {
            const reorderedLists = reorder(orderedData, source.index, destination.index);
            const items = reorderedLists.map((item, index) => ({
                id: item.id,
                order: index,
            }));

            console.log("[ListContainer] Reordering lists:", { items, boardId, source: source.index, destination: destination.index });
            
            setOrderedData(reorderedLists.map((item, index) => ({...item, order: index})));
            
            console.log("[ListContainer] Calling executeUpdateListOrder");
            executeUpdateListOrder({
                items,
                boardId,
            });
        }
        if(type === "card") {
            let newOrderedData = [...orderedData];

            const sourceList = newOrderedData.find((list) => list.id === source.droppableId);
            const destinationList = newOrderedData.find((list) => list.id === destination.droppableId);

            if(!sourceList || !destinationList) {return};

            if(!sourceList.cards){
                sourceList.cards = [];
            }

            if(!destinationList.cards){
                destinationList.cards = [];
            }
            
            if(sourceList.id === destinationList.id){
                const reorderedCards = reorder(sourceList.cards, source.index, destination.index);
                reorderedCards.forEach((card, index) => {
                    card.order = index;
                });
                sourceList.cards = reorderedCards;
                setOrderedData(newOrderedData);
                executeUpdateCardOrder({
                    items: reorderedCards,
                    boardId,
                });

            }else{
                const [movedCard] = sourceList.cards.splice(source.index, 1);
                movedCard.listId = destination.droppableId;
                destinationList.cards.splice(destination.index, 0, movedCard);

                sourceList.cards.forEach((card, index) => {
                    card.order = index;
                });
                destinationList.cards.forEach((card, index) => {
                    card.order = index;
                });
                setOrderedData(newOrderedData);
                executeUpdateCardOrder({
                    items: destinationList.cards,
                    boardId,
                });
            }

            }
        }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="lists" type="list" direction="horizontal">
                {(provided) => (
                    <ol 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                        className="flex gap-x-4 h-full min-w-fit">
                        {orderedData.map((list, index) => {
                            return (
                                <ListItem
                                    key={list.id}
                                    index={index}
                                    data={list}
                                />
                            )
                        })}
                        {provided.placeholder}
                        <ListForm />
                        <div className="shrink-0 w-1"/>
                    </ol>
                )}
            </Droppable>
        </DragDropContext>
    )
}