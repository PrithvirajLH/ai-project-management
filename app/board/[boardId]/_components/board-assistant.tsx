"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Bot, Command, Info, Loader2, Mic, Paperclip, Send, Sparkles, User, X } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface BoardAssistantResponse {
  message: string
  snapshot: unknown
  boardId?: string // New board ID if a board was created
  threadId?: string | null
  threadNotice?: string | null
  actionTaken?: boolean // Whether any tools were executed
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const quickActions = [
  { label: "Create list", suggestion: "Create a list named \"\"" },
  { label: "Create card", suggestion: "Create a card named \"\" and assign it to \"\" list" },
  { label: "Move cards", suggestion: "Move all bugs to QA" },
  { label: "Summarize", suggestion: "Summarize Done list" },
]

export function BoardAssistant() {
  const router = useRouter()
  const params = useParams()
  const boardId = params.boardId as string
  const [message, setMessage] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your AI board assistant. I can help you create cards, move cards between lists, rename lists, and more. What would you like to do?",
      timestamp: new Date(),
    },
  ])
  const [threadNotice, setThreadNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  const mutation = useMutation({
    mutationFn: async (message: string): Promise<BoardAssistantResponse> => {
      // Prepare conversation history (exclude the initial welcome message)
      const conversationHistory = messages
        .filter((msg) => msg.id !== "1") // Exclude initial welcome message
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))

      const response = await fetch("/api/board-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          boardId,
          message,
          conversationHistory, // Send previous conversation history
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to process request")
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // User message was already added optimistically, just add assistant response
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      if (data.threadNotice) {
        setThreadNotice(data.threadNotice)
      }
      
      // Focus input after agent response
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
      
      // Only show toast if an action was actually taken
      if (data.actionTaken) {
        toast.success("Action completed")
      }
      
      // If a new board was created, redirect to it
      if (data.boardId && data.boardId !== boardId) {
        toast.success("New board created! Redirecting...")
        setTimeout(() => {
          router.push(`/board/${data.boardId}`)
        }, 1500)
      } else if (data.actionTaken) {
        // Refresh the board to show changes only if action was taken
        setTimeout(() => {
          startTransition(() => {
            router.refresh()
          })
        }, 1000)
      }
    },
    onError: (error: Error, variables) => {
      // User message was already added optimistically, just add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
      
      // Focus input after error
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
      
      toast.error(error.message || "Failed to process request")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || mutation.isPending) return
    
    const userMessageText = message.trim()
    
    // Add user message immediately (optimistic update)
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessageText,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setMessage("") // Clear input immediately
    
    // Focus input after clearing
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
    
    // Trigger mutation
    mutation.mutate(userMessageText)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <>
      {/* Floating button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
            aria-label="Open AI Assistant"
          >
            <Bot className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0 glass-panel border-l border-border/50">
        <SheetHeader className="border-b border-border/30 px-6 py-5 bg-gradient-to-r from-muted/30 via-muted/10 to-transparent backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                AI Board Assistant
              </SheetTitle>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/10"
                onClick={() => {
                  setMessage(action.suggestion)
                  setIsOpen(true)
                  textareaRef.current?.focus()
                }}
              >
                <Command className="h-3.5 w-3.5 text-muted-foreground" />
                {action.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        {threadNotice && (
          <div className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-lg border border-amber-200/50 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 shadow-sm">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 text-amber-500" />
              <p className="leading-relaxed">{threadNotice}</p>
            </div>
            <button
              type="button"
              className="rounded-full p-1 text-amber-500 transition hover:bg-amber-100 hover:text-amber-700"
              onClick={() => setThreadNotice(null)}
              aria-label="Dismiss notice"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 animate-fade-in",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <>
                  {/* Avatar - Left for assistant */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground border border-border/30 shadow-sm">
                    <Bot className="h-4 w-4" />
                  </div>
                  
                  {/* Message content - Left for assistant */}
                  <div className="max-w-[80%]">
                    <div className="inline-block rounded-2xl rounded-tl-md bg-background/80 text-foreground px-4 py-3 text-sm shadow-md border border-border/40 glass-card">
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <span className="mt-2 inline-flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Assistant · {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </>
              )}
              
              {msg.role === "user" && (
                <>
                  {/* Message content - Right for user */}
                  <div className="max-w-[80%]">
                    <div className="inline-block rounded-2xl rounded-tr-md bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-4 py-3 text-sm shadow-md border border-primary/30">
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <span className="mt-2 inline-flex items-center gap-2 text-[10px] uppercase tracking-wide text-primary-foreground/80">
                        You · {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Avatar - Right for user */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm border border-primary/40">
                    <User className="h-4 w-4" />
                  </div>
                </>
              )}
            </div>
          ))}
          
          {/* Loading indicator */}
          {mutation.isPending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="inline-block rounded-lg rounded-tl-sm bg-muted text-muted-foreground px-4 py-2.5 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border/40 bg-gradient-to-t from-background via-background/80 to-transparent px-5 py-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative flex items-center gap-3">
              <div className="flex flex-1 items-center rounded-2xl border border-border/60 bg-background/80 px-3 py-2 shadow-sm focus-within:border-primary/50 focus-within:shadow-primary/10 transition">
                <Textarea
                  ref={textareaRef}
                  placeholder="Ask me to reorganize lists, summarize work, or create tasks..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={mutation.isPending}
                  rows={2}
                  className="flex-1 resize-none bg-transparent text-sm border-0 focus-visible:ring-0"
                />
              </div>
              <Button
                type="submit"
                size="icon"
                disabled={mutation.isPending || !message.trim()}
                className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:scale-105 transition disabled:opacity-50 flex items-center justify-center"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-start text-xs text-muted-foreground px-1">
              <span className="inline-flex items-center gap-1">
                <Command className="h-3.5 w-3.5" /> Enter to send · Shift+Enter for newline
              </span>
            </div>
          </form>
        </div>
      </SheetContent>
      </Sheet>
    </>
  )
}
