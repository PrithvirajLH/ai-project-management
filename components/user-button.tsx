"use client"

import { useEffect, useRef, useState, useTransition } from "react"

import Image from "next/image"
import { signIn, signOut, useSession } from "next-auth/react"

import { fetchMe, type GraphMeResponse } from "@/app/actions/fetch-me"

function getInitials(name?: string | null) {
  if (!name) return "?"

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function UserButton() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [profile, setProfile] = useState<GraphMeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profileSessionId, setProfileSessionId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const accessToken = session?.accessToken ?? null
  const sessionUserId = session?.user?.id ?? null

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (!accessToken) {
      return
    }

    if (profile && profileSessionId === sessionUserId) {
      return
    }

    let cancelled = false

    startTransition(async () => {
      try {
        const data = await fetchMe(accessToken)
        if (cancelled) return

        if (!data) {
          setProfile(null)
          setProfileSessionId(null)
          // Don't show error if we have session data to fall back on
          setError(null)
          return
        }

        setProfile({
          jobTitle: data.jobTitle ?? null,
          department: data.department ?? null,
          mail: data.mail ?? null,
          displayName: data.displayName ?? null,
        })
        setProfileSessionId(sessionUserId)
        setError(null)
      } catch (err) {
        if (cancelled) return
        console.error("Failed to fetch Microsoft Graph profile", err)
        // Don't show error if we have session data to fall back on
        setError(null)
        setProfileSessionId(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [accessToken, isOpen, profile, profileSessionId, sessionUserId])

  if (status === "loading") {
    return <div className="h-10 w-32 animate-pulse rounded-full bg-muted" />
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        onClick={() => {
          void signIn("azure-ad")
        }}
        className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        Sign in
      </button>
    )
  }

  const { user } = session
  const initials = getInitials(user.name)

  function toggleMenu() {
    setIsOpen((prev) => !prev)
  }

  const jobTitle = profile?.jobTitle ?? user.jobTitle ?? "-"
  const department = profile?.department ?? user.department ?? "-"
  const email = profile?.mail ?? user.email ?? "Email not available"
  const displayName = profile?.displayName ?? user.name ?? "Signed in"

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleMenu}
        aria-label="Open account menu"
        aria-expanded={isOpen}
        className="size-10 overflow-hidden rounded-full border-2 border-border bg-muted transition-all duration-200 hover:border-primary hover:scale-110 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-95"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? "Profile"}
            width={44}
            height={44}
            className="size-full object-cover"
            priority
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </div>
        )}
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-14 z-50 w-64 rounded-lg border bg-popover p-3 text-sm shadow-lg">
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="size-10 overflow-hidden rounded-full border border-border bg-muted flex-shrink-0">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? "Profile"}
                    width={40}
                    height={40}
                    className="size-full object-cover"
                    priority
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-primary/10 text-sm font-semibold text-primary">
                    {initials}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
            </div>
            
            {(jobTitle !== "-" || department !== "-" || isPending) && (
              <div className="space-y-2 text-xs">
                {jobTitle !== "-" && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground min-w-[60px]">Title:</span>
                    <span className="text-foreground">{jobTitle}</span>
                  </div>
                )}
                {department !== "-" && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground min-w-[60px]">Dept:</span>
                    <span className="text-foreground">{department}</span>
                  </div>
                )}
                {isPending && (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                void signOut({ callbackUrl: "/" })
              }}
              className="w-full rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-all duration-200 hover:bg-destructive/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

