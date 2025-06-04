"use client"

import * as React from "react"
import { Sidebar } from "./Sidebar"

interface SidebarWithStoreNameProps {
  children: React.ReactNode
}

export default function SidebarWithStoreName({ children }: SidebarWithStoreNameProps) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-16 md:ml-64 min-h-screen w-full">
        {children}
      </main>
    </div>
  )
} 