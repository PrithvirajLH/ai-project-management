"use client"

import Link from "next/link"

import { UserButton } from "@/components/user-button"
import { WorkspacePill } from "@/components/workspace-pill"

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6">
      <Link href="/" className="text-sm font-semibold text-foreground hover:text-primary">
        AI Project Management
      </Link>
      <div className="flex items-center gap-4">
        <WorkspacePill />
        <UserButton />
      </div>
    </nav>
  )
}

