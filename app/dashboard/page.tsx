"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Package, TrendingUp, DollarSign, Eye, Star, Plus, BarChart3, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase"

export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
    }
  }

  const stats = [
    {
      title: "Toplam Satış",
      value: "₺12,450",
      change: "+12%",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Aktif Ürünler",
      value: "48",
      change: "+3",
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "Bekleyen Siparişler",
      value: "7",
      change: "-2",
      icon: ShoppingBag,
      color: "text-orange-600",
    },
    {
      title: "Görüntülenme",
      value: "1,234",
      change: "+18%",
      icon: Eye,
      color: "text-purple-600",
    },
  ]

  const recentOrders = [
    {
      id: "#1234",
      customer: "Ayşe Yılmaz",
      product: "Minimalist Mountain Canvas 16x20",
      amount: "₺89",
      status: "Hazırlanıyor",
    },
    { id: "#1235", customer: "Mehmet Kaya", product: "Boho Sunset Canvas 24x36", amount: "₺156", status: "Kargoda" },
    {
      id: "#1236",
      customer: "Zehra Demir",
      product: "Abstract Geometric Print 12x16",
      amount: "₺67",
      status: "Teslim Edildi",
    },
  ]

  const topProducts = [
    { name: "Minimalist Mountain Canvas", sales: 23, revenue: "₺2,047", rating: 4.8 },
    { name: "Boho Sunset Canvas", sales: 18, revenue: "₺2,808", rating: 4.9 },
    { name: "Abstract Geometric Print", sales: 15, revenue: "₺1,005", rating: 4.7 },
  ]

  const urgentTasks = [
    { task: "5 ürün SEO optimizasyonu gerekli", type: "seo", count: 5 },
    { task: "3 sipariş üretim aşamasında", type: "production", count: 3 },
    { task: "2 üretici ödemesi gecikmiş", type: "payment", count: 2 },
    { task: "Sevgililer Günü'ne 20 gün kaldı", type: "seasonal", count: 20 },
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Son Siparişler</CardTitle>
            <CardDescription>En son gelen siparişleriniz</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{order.customer}</p>
                    <p className="text-sm text-gray-600">{order.product}</p>
                    <p className="text-xs text-gray-500">{order.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{order.amount}</p>
                    <Badge
                      variant={
                        order.status === "Teslim Edildi"
                          ? "default"
                          : order.status === "Kargoda"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>En Çok Satan Ürünler</CardTitle>
            <CardDescription>Bu ayki performans liderleri</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-gray-600">{product.sales} satış</span>
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600 ml-1">{product.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{product.revenue}</p>
                    <div className="flex items-center text-green-600">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      <span className="text-xs">Yükseliş</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
