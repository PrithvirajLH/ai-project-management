"use client";

import {useFormStatus} from "react-dom";

import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";

interface FormSubmitProps{
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" ;

};

export const FormButton = ({
    children,
    disabled,
    className,
    variant,
}: FormSubmitProps) => {
    const {pending} = useFormStatus();
    return (
        <Button 
        disabled={pending || disabled} 
        className={cn(className)} 
        variant={variant}
        size= "sm"
        type="submit">
            {children}
        </Button>
    );
};