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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/dolphin-logo.svg" alt="Dolphin Manager" className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">Hoş geldin Yunus! Canvas wall art işin nasıl gidiyor?</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => router.push("/dolphin-ai")}>
                <BarChart3 className="w-4 h-4 mr-2" />
                AI Önerileri
              </Button>
              <Button size="sm" onClick={() => router.push("/products")}>
                <Plus className="w-4 h-4 mr-2" />
                Yeni Ürün
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section with Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-lg">
              <img src="/dolphin-logo.svg" alt="Dolphin Manager" className="w-12 h-12" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Canvas Wall Art İmparatorluğun</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Etsy'deki canvas wall art satışlarını yönet, AI ile optimize et, karını maksimize et! 🎨
          </p>
        </div>

        {/* Urgent Tasks Alert */}
        <Card className="mb-8 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Acil Görevler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {urgentTasks.map((task, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm text-gray-700">{task.task}</span>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    {task.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className={`text-sm ${stat.color}`}>{stat.change} bu ay</p>
                    </div>
                    <div className={`p-3 rounded-full bg-gray-100`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Son Siparişler</CardTitle>
                  <CardDescription>En son gelen canvas siparişlerin</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/orders")}>
                  Tümünü Gör
                </Button>
              </div>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>En Çok Satan Canvas'lar</CardTitle>
                  <CardDescription>Bu ayki performans liderlerin</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/products")}>
                  Ürünleri Gör
                </Button>
              </div>
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

        {/* AI Suggestions */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <span className="mr-2">🤖</span>
                  Dolphin AI Önerileri
                </CardTitle>
                <CardDescription>Canvas wall art satışlarını artırmak için AI önerileri</CardDescription>
              </div>
              <Button onClick={() => router.push("/dolphin-ai")} className="bg-orange-500 hover:bg-orange-600">
                Detaylı Analiz
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">🎯 Boyut Optimizasyonu</h4>
                <p className="text-sm text-blue-700">
                  16x20 inch boyutu çok popüler! Bu boyutta daha fazla minimalist tasarım ekle.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">📅 Mevsimsel Fırsat</h4>
                <p className="text-sm text-green-700">
                  Sevgililer Günü yaklaşıyor. Romantik ve aşk temalı canvas'lar hazırla!
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-900 mb-2">🏷️ SEO İyileştirme</h4>
                <p className="text-sm text-purple-700">5 ürününde SEO puanı düşük. "wall art" ve boyut bilgisi ekle.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Hızlı İşlemler</CardTitle>
            <CardDescription>Sık kullandığın işlemler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col" onClick={() => router.push("/products")}>
                <Package className="w-6 h-6 mb-2" />
                Ürün Ekle
              </Button>
              <Button variant="outline" className="h-20 flex-col" onClick={() => router.push("/seo-optimizer")}>
                <TrendingUp className="w-6 h-6 mb-2" />
                SEO Optimize Et
              </Button>
              <Button variant="outline" className="h-20 flex-col" onClick={() => router.push("/costs")}>
                <DollarSign className="w-6 h-6 mb-2" />
                Maliyet Hesapla
              </Button>
              <Button variant="outline" className="h-20 flex-col" onClick={() => router.push("/supplier-payments")}>
                <BarChart3 className="w-6 h-6 mb-2" />
                Üretici Öde
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
