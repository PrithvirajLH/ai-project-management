import { List } from "@/lib/lists";
import { Card } from "@/lib/cards";

export type ListWithCards = List & {
    cards: Card[];
}

export type CardWithList = Card & {
    list: List;
}

export type AuditLog = {
    id: string;
    workspaceId: string;
    action: string;
    entityId: string;
    entityType: string;
    entityTitle: string;
    userId: string;
    userImage?: string | null;
    username: string;
    isAgentAction?: boolean;
    createdAt: Date;
    updatedAt: Date;
}