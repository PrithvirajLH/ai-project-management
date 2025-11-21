"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { useSession } from "next-auth/react"

import { UserButton } from "@/components/user-button"
import { WorkspacePill } from "@/components/workspace-pill"
import { MobileSidebar } from "./mobile-sidebar"
import { FormPopover } from "@/components/forms/form-popover"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <MobileSidebar />
        <Link href="/" className="flex items-center gap-2 text-base font-bold text-foreground hover:text-primary transition-all duration-200 hover:scale-105 group">
          <span className="relative">
            <span className="absolute inset-0 bg-primary/10 rounded blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <span className="relative">AI Project Management</span>
          </span>
        </Link>
        {session?.user && (
          <FormPopover side="bottom" align="start" sideOffset={18}>
            <Button size="icon" variant="secondary" className="h-8 w-8 transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-md">
              <Plus className="h-4 w-4 transition-transform duration-200" />
            </Button>
          </FormPopover>
        )}
      </div>
      <div className="flex items-center gap-3">
        <WorkspacePill />
        <UserButton />
      </div>
    </nav>
  )
}

