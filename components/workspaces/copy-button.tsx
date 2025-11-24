"use client"

import { useState } from "react"
import { Copy, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  text: string
  className?: string
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-muted",
        className
      )}
      title="Copy ID"
    >
      {copied ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  )
}

