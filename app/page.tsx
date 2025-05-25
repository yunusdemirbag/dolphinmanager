"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClientSupabase()
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkStoreConnection()
  }, [])

  const checkStoreConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/auth/login")
        return
      }
      // Check if user has any stores connected
      const { data: profile } = await supabase.from("profiles").select("etsy_shop_name").eq("id", session.user.id).single()
      if (!profile?.etsy_shop_name) {
        router.push("/onboarding")
        return
      }
      // Gerçek sipariş ve ürünleri çek (örnek, kendi API'nıza göre düzenleyin)
      const { data: ordersData } = await supabase.from("orders").select("*").eq("user_id", session.user.id)
      const { data: productsData } = await supabase.from("products").select("*").eq("user_id", session.user.id)
      setOrders(ordersData || [])
      setProducts(productsData || [])
    } catch (error) {
      console.error("Error checking store connection:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg">
            <img src="/dolphin-logo.svg" alt="Dolphin Manager" className="w-16 h-16" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Hoş Geldiniz!</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Etsy mağazanızı yönetmek için gereken tüm araçlar burada.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Son Siparişler</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-40 text-gray-500">Yükleniyor...</div>
            ) : orders.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-500">Henüz sipariş bulunmuyor</div>
            ) : (
              <ul>
                {orders.map((order) => (
                  <li key={order.id} className="mb-2">
                    {order.title} - {order.status}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>En Çok Satan Ürünler</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-40 text-gray-500">Yükleniyor...</div>
            ) : products.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-500">Henüz ürün bulunmuyor</div>
            ) : (
              <ul>
                {products.map((product) => (
                  <li key={product.id} className="mb-2">
                    {product.title}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
