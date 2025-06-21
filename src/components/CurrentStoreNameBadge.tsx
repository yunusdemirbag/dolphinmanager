"use client"
import { Store } from "lucide-react"
import { useEffect, useState } from "react"

export default function CurrentStoreNameBadge({ shopName }: { shopName?: string }) {
  const [name, setName] = useState<string | undefined>(shopName)

  useEffect(() => {
    if (!shopName && typeof window !== "undefined") {
      const localName = localStorage.getItem("selectedStoreName") || undefined
      setName(localName)
    }
  }, [shopName])

  if (!name) return null

  return (
    <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium shadow-sm mb-2">
      <Store className="w-4 h-4 mr-1 text-black" />
      {name}
    </div>
  )
} 