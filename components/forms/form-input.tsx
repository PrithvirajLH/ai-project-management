"use client";

import { forwardRef } from "react";
import { useFormStatus } from "react-dom";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { FormErrors } from "./form-errors";

interface FormInputProps {
    id: string;
    name?: string;
    label?: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    errors?: Record<string, string[] | undefined> ;
    className?: string;
    defaultValue?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: () => void;
};

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
    id,
    name,
    label,
    type = "text",
    placeholder,
    required = false,
    disabled = false,
    errors = {},
    className,
    defaultValue = "",
    value,
    onChange,
    onBlur,
}, ref) => {
    const {pending} = useFormStatus();
    return (
        <div className="space-y-2">
            <div className="space-y-1">
                {label ? (
                        <Label 
                        htmlFor={id}
                        className="text-sm font-semibold text-neutral-700"
                        >
                            {label}
                        </Label> 
                ) : null}
                <Input
                    id={id}
                    name={name ?? id}
                    ref={ref}
                    type={type}
                    placeholder={placeholder}
                    required={required}
                    disabled={pending || disabled}
                    defaultValue={defaultValue}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    className={cn("text-sm px-2 py-1 h-9", className)}
                    aria-describedby={`${id}-error`}
                />
            </div>
            <FormErrors
                id={id}
                errors={errors}
            />
        </div>
    )
});

FormInput.displayName = "FormInput";