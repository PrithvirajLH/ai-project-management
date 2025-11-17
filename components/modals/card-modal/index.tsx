"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCardModal } from "@/hooks/use-card-modal";
import { fetcher } from "@/lib/fetcher";
import { CardWithList } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Header } from "../header";

export const CardModal = () => {
    const id = useCardModal((state) => state.id);
    const isOpen = useCardModal((state) => state.isOpen);
    const onClose = useCardModal((state) => state.onClose);
    const {data: cardData} = useQuery<CardWithList>({
        queryKey: ["card", id],
        queryFn: () => fetcher(`/api/cards/${id}`),
        enabled: !!id && isOpen,
    })
    
    if (!id) {
        return null;
    }
    
    return (
        <Dialog
            open={isOpen}
            onOpenChange={onClose}
        >
            <DialogContent>
                <DialogTitle className="sr-only">
                    {cardData?.title || "Card Details"}
                </DialogTitle>
                {!cardData ? (
                    <Header.Skeleton />
                ) : (
                    <Header data={cardData} />
                )}
            </DialogContent>
        </Dialog>
    );
};