"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCardModal } from "@/hooks/use-card-modal";
import { fetcher } from "@/lib/fetcher";
import { CardWithList } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Header } from "./header";
import { Description } from "./description";
import { Actions } from "./actions";
import { AuditLog } from "@/types";
import { Activity } from "./activity";

export const CardModal = () => {
    const id = useCardModal((state) => state.id);
    const isOpen = useCardModal((state) => state.isOpen);
    const onClose = useCardModal((state) => state.onClose);
    const {data: cardData} = useQuery<CardWithList>({
        queryKey: ["card", id],
        queryFn: () => fetcher(`/api/cards/${id}`),
        enabled: !!id && isOpen,
    });

    const {data: auditLogsData} = useQuery<AuditLog[]>({
        queryKey: ["audit-logs", id],
        queryFn: () => fetcher(`/api/cards/${id}/logs`),
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
                ) : 
                    <Header data={cardData} />
                }
                <div className="grid grid-cols-1 md:grid-cols-4 md:gap-4">
                    <div className="col-span-3">
                        <div className="w-full space-y-6">
                            {!cardData ? <Description.Skeleton />
                            : <Description data={cardData} />
                            }
                            {!auditLogsData ? <Activity.Skeleton />
                            : <Activity items={auditLogsData} />
                            }   
                        </div>

                    </div>
                    {
                        !cardData ? <Actions.Skeleton />
                        : <Actions data={cardData} />
                    }
                </div>
            </DialogContent>
        </Dialog>
    );
};