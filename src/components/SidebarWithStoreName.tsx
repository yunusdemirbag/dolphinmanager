"use client"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/Sidebar"

export default function SidebarWithStoreName() {
  const [currentStoreName, setCurrentStoreName] = useState<string | undefined>(undefined)

  useEffect(() => {
    const name = localStorage.getItem("selectedStoreName")
    if (name) setCurrentStoreName(name)
  }, [])

  return <Sidebar currentStoreName={currentStoreName} />
} 