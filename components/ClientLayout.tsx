"use client"

import * as React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import DndWrapper from "@/components/DndWrapper"
import { TouchBackend } from "react-dnd-touch-backend"
import { HTML5Backend } from "react-dnd-html5-backend"
import { DndProvider } from "react-dnd"
import { isTouchDevice } from "@/lib/utils"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)
  const [isTouch, setIsTouch] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    setIsTouch(isTouchDevice())
  }, [])

  if (!mounted) {
    return null
  }

  // Dokunmatik cihazlar için TouchBackend, diğerleri için HTML5Backend kullan
  const backend = isTouch ? TouchBackend : HTML5Backend
  const options = isTouch ? { enableMouseEvents: true, enableTouchEvents: true, delayTouchStart: 0 } : {}

  return (
    <ThemeProvider defaultTheme="light" enableSystem={false} forcedTheme="light">
      <DndProvider backend={backend} options={options}>
        {children}
      </DndProvider>
    </ThemeProvider>
  )
} 