"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormErrors } from "@/components/forms/form-errors"
import { cn } from "@/lib/utils"
import { Mail } from "lucide-react"

interface EmailAutocompleteInputProps {
  id: string
  name?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  errors?: Record<string, string[] | undefined>
  className?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void
}

// Common email domains to suggest
const COMMON_DOMAINS = [
  "csnhc.com",
]

export function EmailAutocompleteInput({
  id,
  name,
  label,
  placeholder = "colleague@example.com",
  required = false,
  disabled = false,
  errors = {},
  className,
  value,
  onChange,
  onBlur,
}: EmailAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const inputValue = e.target.value
    onChange(e)

    if (!inputValue || !inputValue.includes("@")) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const [localPart, domainPart] = inputValue.split("@")
    
    if (!domainPart) {
      // Show common domains
      const domainSuggestions = COMMON_DOMAINS.map((domain) => `${localPart}@${domain}`)
      setSuggestions(domainSuggestions.slice(0, 5))
      setShowSuggestions(true)
    } else {
      // Filter domains that start with what user typed
      const filtered = COMMON_DOMAINS.filter((domain) =>
        domain.toLowerCase().startsWith(domainPart.toLowerCase())
      )
      if (filtered.length > 0) {
        const domainSuggestions = filtered.map((domain) => `${localPart}@${domain}`)
        setSuggestions(domainSuggestions.slice(0, 5))
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }
    setSelectedIndex(-1)
  }

  function handleSuggestionClick(suggestion: string) {
    const syntheticEvent = {
      target: { value: suggestion },
    } as React.ChangeEvent<HTMLInputElement>
    onChange(syntheticEvent)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Escape") {
        setShowSuggestions(false)
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex])
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <div className="space-y-1">
        {label && (
          <Label htmlFor={id} className="text-sm font-semibold text-neutral-700">
            {label}
          </Label>
        )}
        <div className="relative">
          <Input
            id={id}
            name={name ?? id}
            ref={inputRef}
            type="email"
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            onBlur={onBlur}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
            className={cn("text-sm px-2 py-1 h-9 pr-10", className)}
            aria-describedby={`${id}-error`}
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls={showSuggestions ? `${id}-suggestions` : undefined}
          />
          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul
          id={`${id}-suggestions`}
          className="absolute z-50 w-full mt-1 rounded-lg border border-border/50 bg-background shadow-lg overflow-hidden animate-fade-in"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={index === selectedIndex}
              className={cn(
                "px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2",
                index === selectedIndex
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted/50 text-foreground"
              )}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">{suggestion}</span>
            </li>
          ))}
        </ul>
      )}

      <FormErrors id={id} errors={errors} />
    </div>
  )
}

