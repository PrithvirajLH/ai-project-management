"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Bot, Loader2, Send } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

interface BoardAssistantResponse {
  message: string
  snapshot: unknown
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
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: variables,
        timestamp: new Date(),
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setMessage("")
      
      // Show toast for success
      toast.success("Action completed")
      
      // Refresh the board to show changes - wait for server-side revalidation to complete
      setTimeout(() => {
        startTransition(() => {
          router.refresh()
        })
      }, 1000)
    },
    onError: (error: Error, variables) => {
      // Add user message even on error
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: variables,
        timestamp: new Date(),
      }

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage, errorMessage])
      toast.error(error.message || "Failed to process request")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || mutation.isPending) return
    mutation.mutate(message.trim())
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
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <SheetTitle>AI Board Assistant</SheetTitle>
          </div>
          <SheetDescription>
            Ask me to create cards, move cards, rename lists, or make other changes to your board.
          </SheetDescription>
        </SheetHeader>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {mutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
              ref={textareaRef}
              placeholder="Type your request... (e.g., Create a card called 'Fix login bug' in 'In Progress')"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={mutation.isPending}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={mutation.isPending || !message.trim()}
                size="sm"
              >
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
      </Sheet>
    </>
  )
}
