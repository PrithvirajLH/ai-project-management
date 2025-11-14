"use client"

import Link from "next/link"
import { Plus } from "lucide-react"

import { UserButton } from "@/components/user-button"
import { WorkspacePill } from "@/components/workspace-pill"
import { MobileSidebar } from "./mobile-sidebar"
import { FormPopover } from "@/components/forms/form-popover"
import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebar />
        <Link href="/" className="text-sm font-semibold text-foreground hover:text-primary">
          AI Project Management
        </Link>
        <FormPopover side="bottom" align="start" sideOffset={18}>
          <Button size="icon" variant="secondary" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </FormPopover>
      </div>
      <div className="flex items-center gap-4">
        <WorkspacePill />
        <UserButton />
      </div>
    </nav>
  )
}

