"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Package, TrendingUp, DollarSign, Eye, Star, Plus, BarChart3 } from "lucide-react"

export default function Dashboard() {
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
    { id: "#1234", customer: "Ayşe Yılmaz", product: "El Yapımı Kolye", amount: "₺89", status: "Hazırlanıyor" },
    { id: "#1235", customer: "Mehmet Kaya", product: "Vintage Yüzük", amount: "₺156", status: "Kargoda" },
    { id: "#1236", customer: "Zehra Demir", product: "Doğal Taş Bileklik", amount: "₺67", status: "Teslim Edildi" },
  ]

  const topProducts = [
    { name: "El Yapımı Kolye", sales: 23, revenue: "₺2,047", rating: 4.8 },
    { name: "Vintage Yüzük", sales: 18, revenue: "₺2,808", rating: 4.9 },
    { name: "Doğal Taş Bileklik", sales: 15, revenue: "₺1,005", rating: 4.7 },
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
              <h1 className="text-2xl font-bold text-gray-900">Dolphin Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Raporlar
              </Button>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Ürün
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section with Logo */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-lg">
              <img src="/dolphin-logo.svg" alt="Dolphin Manager" className="w-16 h-16" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Hoş Geldiniz!</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Etsy mağazanızı yönetmek için gereken tüm araçlar burada. Satışlarınızı takip edin, ürünlerinizi optimize
            edin ve AI destekli önerilerle büyüyün.
          </p>
        </div>

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

        {/* AI Suggestions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2">🤖</span>
              AI Önerileri
            </CardTitle>
            <CardDescription>Satışlarınızı artırmak için kişiselleştirilmiş öneriler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Fiyat Optimizasyonu</h4>
                <p className="text-sm text-blue-700">
                  "El Yapımı Kolye" ürününüzün fiyatını %8 artırarak daha fazla kar elde edebilirsiniz.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Stok Uyarısı</h4>
                <p className="text-sm text-green-700">
                  "Vintage Yüzük" stokları azalıyor. Yeni sipariş verme zamanı geldi.
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-900 mb-2">Trend Analizi</h4>
                <p className="text-sm text-purple-700">
                  Doğal taş aksesuarlar bu sezon trend. Koleksiyonunuzu genişletmeyi düşünün.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
