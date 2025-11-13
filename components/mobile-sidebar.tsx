"use client"

import { useMobileSidebar } from "@/hooks/use-mobile-sidebar"
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { SheetContent , Sheet, SheetTitle } from "./ui/sheet";
import { Sidebar } from "./sidebar";

export function MobileSidebar() {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const onOpen = useMobileSidebar((state) => state.onOpen);
    const onClose = useMobileSidebar((state) => state.onClose);
    const isOpen = useMobileSidebar((state) => state.isOpen);

    useEffect(() => {
        const id = setTimeout(() => setIsMounted(true), 0);
        return () => clearTimeout(id);
    }, []);


    useEffect(() => {
            onClose();
    }, [pathname, onClose]);

    if (!isMounted) {
        return null;
    }

    return (
        <>
        <Button
        variant="ghost"
        size="sm"
        onClick={onOpen}
        className="block md:hidden mr-2" 
        >
            <Menu className="h-4 w-4" />
        </Button>
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="left" className="p-2 pt-10">
                <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
                <Sidebar
                storageKey="t-sidebar-mobile-state"
                />
            </SheetContent>
        </Sheet>
        </>
    )
}