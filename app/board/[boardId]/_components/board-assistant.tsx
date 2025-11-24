"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Bot, Info, Loader2, Send, User, X } from "lucide-react"
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
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

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
      
      // Show toast for success
      toast.success("Action completed")
      
      // If a new board was created, redirect to it
      if (data.boardId && data.boardId !== boardId) {
        toast.success("New board created! Redirecting...")
        setTimeout(() => {
          router.push(`/board/${data.boardId}`)
        }, 1500)
      } else {
        // Refresh the board to show changes - wait for server-side revalidation to complete
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
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="border-b px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base font-semibold">AI Board Assistant</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                Create cards, move items, rename lists, and more
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {threadNotice && (
          <div className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <>
                  {/* Avatar - Left for assistant */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  
                  {/* Message content - Left for assistant */}
                  <div className="max-w-[80%]">
                    <div className="inline-block rounded-lg rounded-tl-sm bg-muted text-muted-foreground px-4 py-2.5 text-sm shadow-sm">
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                </>
              )}
              
              {msg.role === "user" && (
                <>
                  {/* Message content - Right for user */}
                  <div className="max-w-[80%]">
                    <div className="inline-block rounded-lg rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm shadow-sm">
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                  
                  {/* Avatar - Right for user */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
        <div className="border-t bg-background px-4 py-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder="Type your request..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={mutation.isPending}
                rows={2}
                className="resize-none pr-12 text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={mutation.isPending || !message.trim()}
                className="absolute bottom-2 right-2 h-8 w-8"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground px-1">
              Press Enter to send, Shift+Enter for new line
            </p>
          </form>
        </div>
      </SheetContent>
      </Sheet>
    </>
  )
}
