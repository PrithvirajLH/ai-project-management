"use client"

import { useRef, useState, useEffect, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface DragScrollContainerProps {
  children: ReactNode
  className?: string
}

export function DragScrollContainer({ children, className }: DragScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Check if clicking on any draggable element (lists, cards, or their children)
      // Only check for actual draggable items, not containers
      const isDraggableItem = 
        target.closest('[data-rbd-draggable-id]') || 
        target.closest('[data-rbd-drag-handle-draggable-id]') ||
        // Check if clicking inside a list item (but not the empty space between lists)
        (target.closest('li') && target.closest('li[class*="shrink-0"]'))
      
      // Only enable drag scrolling if NOT clicking on a draggable item
      // This works anywhere in the container (top, bottom, sides) as long as it's not a draggable item
      if (!isDraggableItem && e.button === 0) {
        setIsDragging(true)
        setStartX(e.pageX - container.offsetLeft)
        setScrollLeft(container.scrollLeft)
        container.style.cursor = "grabbing"
        container.style.userSelect = "none"
      }
    }

    const handleMouseLeave = () => {
      setIsDragging(false)
      if (container) {
        container.style.cursor = "grab"
        container.style.userSelect = ""
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      if (container) {
        container.style.cursor = "grab"
        container.style.userSelect = ""
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !container) return
      e.preventDefault()
      const x = e.pageX - container.offsetLeft
      const walk = (x - startX) * 2 // Scroll speed multiplier
      container.scrollLeft = scrollLeft - walk
    }

    // Use bubbling phase (not capture) so drag-and-drop library can handle events first
    container.addEventListener("mousedown", handleMouseDown, false)
    container.addEventListener("mouseleave", handleMouseLeave)
    container.addEventListener("mouseup", handleMouseUp)
    container.addEventListener("mousemove", handleMouseMove)

    // Set initial cursor
    container.style.cursor = "grab"

    return () => {
      container.removeEventListener("mousedown", handleMouseDown, false)
      container.removeEventListener("mouseleave", handleMouseLeave)
      container.removeEventListener("mouseup", handleMouseUp)
      container.removeEventListener("mousemove", handleMouseMove)
    }
  }, [isDragging, startX, scrollLeft])

  return (
    <div ref={containerRef} className={cn(className)}>
      {children}
    </div>
  )
}
