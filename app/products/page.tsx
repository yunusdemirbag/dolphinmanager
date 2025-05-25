import { Metadata } from "next"
import { requireAuth } from "@/lib/auth"
import ProductsClient from "./products-client"

export const metadata: Metadata = {
  title: "Ürünlerim | Dolphin Manager",
  description: "Etsy ürünlerinizi görüntüleyin ve yönetin",
}

export default async function ProductsPage() {
  // Server-side auth kontrolü
  const user = await requireAuth()
  
  return (
    <div className="bg-white">
      <ProductsClient />
    </div>
  )
}
