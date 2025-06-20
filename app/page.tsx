"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/login")
        return
      }
      
      // Kullanıcı varsa dashboard'a yönlendir
      router.push("/dashboard")
    })
    
    return () => unsubscribe()
  }, [])

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">DM</span>
            </div>
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
