import { List } from "@/lib/lists";
import { Card } from "@/lib/cards";

export type ListWithCards = List & {
    cards: Card[];
}

export type CardWithList = Card & {
    list: List;
}