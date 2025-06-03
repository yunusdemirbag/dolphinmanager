import { requireAuth } from "@/lib/auth"
import { metadata } from "./metadata"

export { metadata }

export default async function ProductsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side auth kontrolü
  const user = await requireAuth()
  
  return (
    <div className="bg-white">
      {children}
    </div>
  )
} 