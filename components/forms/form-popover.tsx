"use client";

import { Popover,
    PopoverContent,
    PopoverTrigger,
    PopoverClose,
 } from "@/components/ui/popover";

 import { useAction } from "@/hooks/use-action";
 import {createBoard} from "@/actions/create-board";
import { useWorkspace } from "@/hooks/use-workspace";

 import { FormInput } from "./form-input";
 import { FormButton } from "./form-button";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

 interface FormPopoverProps {
    children: React.ReactNode;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    sideOffset?: number;
 };

 export const FormPopover = ({
    children,
    side = "bottom",
    align,
    sideOffset = 0,
 }: FormPopoverProps) => {
    const { workspace } = useWorkspace();
    const {execute, fieldErrors} = useAction(createBoard, {
        onSuccess: () => {
            console.log("Board created successfully");
        },
        onError: () => {
            console.log("Failed to create board");
        },
    });

    const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!workspace) {
            return;
        }
        const formData = new FormData(event.currentTarget);
        const title = (formData.get("title") as string)?.trim() ?? "";
        if (!title) {
            return;
        }
        execute({ title, workspaceId: workspace.id });
        event.currentTarget.reset();
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent
                side={side}
                align={align}
                sideOffset={sideOffset}
                className="w-80 pt-3"
            >
                <div className="text-sm font-medium text-center text-neutral-600">
                    Create a new board
                </div>
                <PopoverClose asChild>
                    <Button className="h-auto w-auto p-2 absolute top-2 right-2 text-neutral-600" variant="ghost">
                        <X className="h-4 w-4" />
                    </Button>
                </PopoverClose>
                <form className="space-y-4" onSubmit={onSubmit}>
                    <div className="space-y-4">
                        <FormInput
                            id="title"
                            label="Board Title"
                            type="text"
                            placeholder="Enter a title for your board"
                            errors={fieldErrors}
                        />
                        <FormButton className="w-full">
                            Create
                        </FormButton>
                    </div>
                </form>
            </PopoverContent>
        </Popover>
    );
 }