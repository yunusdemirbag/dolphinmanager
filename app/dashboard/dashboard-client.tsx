"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import {
  Store,
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Eye,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  BarChart3,
} from "lucide-react"
import { useRouter } from "next/navigation"
import StoreSelector from "@/components/store-selector"

interface DashboardClientProps {
  user: any
  profile: any
  dashboardData: any
}

export default function DashboardClient({ user, profile, dashboardData }: DashboardClientProps) {
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState("30d")
  const router = useRouter()

  // Gerçek mağaza verilerini kullan - demo veri yok
  const stores = dashboardData.stores || []
  const currentStore = stores.find((store) => store.id === selectedStore) || stores[0]

  useEffect(() => {
    if (!selectedStore && stores.length > 0) {
      setSelectedStore(stores[0].id)
    }
  }, [selectedStore, stores])

  // Sadece gerçek veriler - demo veri yok
  const storeData = {
    revenue: dashboardData.revenue || 0,
    orders: dashboardData.orders || 0,
    views: dashboardData.views || 0,
    favorites: dashboardData.favorites || 0,
    conversion_rate: dashboardData.conversion_rate || 0,
    avg_order_value: dashboardData.avg_order_value || 0,
    products: dashboardData.products || [],
    ordersList: dashboardData.ordersList || [],
  }

  // Gerçek chart verilerini kullan - demo veri yok
  const chartData = dashboardData.chartData || []

  const handleStoreChange = (storeId: string) => {
    setSelectedStore(storeId)
    // Burada store verilerini yeniden yükleyebilirsiniz
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">Mağaza performansınızı takip edin</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push("/stores")}>
                <Store className="w-4 h-4 mr-2" />
                Mağazalar
              </Button>
              <Button variant="outline" onClick={() => router.push("/analytics/stores")}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Tüm Analitikler
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Store Selector */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Aktif Mağaza</h2>
            <div className="flex items-center space-x-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="7d">Son 7 Gün</option>
                <option value="30d">Son 30 Gün</option>
                <option value="90d">Son 90 Gün</option>
              </select>
            </div>
          </div>
          <StoreSelector
            stores={stores}
            selectedStore={selectedStore}
            onStoreChange={handleStoreChange}
            showAddStore={true}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
                  <p className="text-2xl font-bold text-gray-900">₺{storeData.revenue.toLocaleString()}</p>
                  <div className="flex items-center mt-1">
                    {dashboardData.revenueChange >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm ${dashboardData.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardData.revenueChange ? `${dashboardData.revenueChange > 0 ? '+' : ''}${dashboardData.revenueChange}%` : 'Veri yok'}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-orange-50">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Siparişler</p>
                  <p className="text-2xl font-bold text-gray-900">{storeData.orders}</p>
                  <div className="flex items-center mt-1">
                    {dashboardData.ordersChange >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm ${dashboardData.ordersChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardData.ordersChange ? `${dashboardData.ordersChange > 0 ? '+' : ''}${dashboardData.ordersChange}%` : 'Veri yok'}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-blue-50">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Görüntülenme</p>
                  <p className="text-2xl font-bold text-gray-900">{storeData.views.toLocaleString()}</p>
                  <div className="flex items-center mt-1">
                    {dashboardData.viewsChange >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm ${dashboardData.viewsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardData.viewsChange ? `${dashboardData.viewsChange > 0 ? '+' : ''}${dashboardData.viewsChange}%` : 'Veri yok'}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-purple-50">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Dönüşüm Oranı</p>
                  <p className="text-2xl font-bold text-gray-900">%{storeData.conversion_rate}</p>
                  <div className="flex items-center mt-1">
                    {dashboardData.conversionChange >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm ${dashboardData.conversionChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboardData.conversionChange ? `${dashboardData.conversionChange > 0 ? '+' : ''}${dashboardData.conversionChange}%` : 'Veri yok'}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-green-50">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Store Info Card */}
        <Card className="mb-8 border-orange-200">
          <CardHeader className="bg-orange-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Store className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-orange-900">{currentStore?.shop_name}</CardTitle>
                  <CardDescription className="text-orange-700">
                    {currentStore?.listing_active_count} aktif ürün • {currentStore?.num_favorers} takipçi
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-0">
                  {currentStore?.is_active ? "Aktif" : "Pasif"}
                </Badge>
                <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Senkronize Et
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Package className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{currentStore?.listing_active_count}</p>
                <p className="text-sm text-gray-600">Aktif Ürünler</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Users className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{currentStore?.num_favorers}</p>
                <p className="text-sm text-gray-600">Takipçiler</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <DollarSign className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">₺{storeData.avg_order_value}</p>
                <p className="text-sm text-gray-600">Ortalama Sipariş</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Haftalık Performans</CardTitle>
              <CardDescription>Son 7 günün sipariş ve gelir analizi</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#F97316" name="Siparişler" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-300 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Henüz chart verisi yok</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Görüntülenme Trendi</CardTitle>
              <CardDescription>Haftalık görüntülenme sayıları</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" stroke="#8B5CF6" strokeWidth={2} name="Görüntülenme" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-300 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Henüz görüntülenme verisi yok</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center border-orange-200 hover:bg-orange-50"
            onClick={() => router.push("/products")}
          >
            <Package className="w-6 h-6 mb-2 text-orange-600" />
            <span className="text-orange-700">Ürünleri Yönet</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center border-blue-200 hover:bg-blue-50"
            onClick={() => router.push("/orders")}
          >
            <ShoppingCart className="w-6 h-6 mb-2 text-blue-600" />
            <span className="text-blue-700">Siparişler</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center border-purple-200 hover:bg-purple-50"
            onClick={() => router.push("/analytics")}
          >
            <BarChart3 className="w-6 h-6 mb-2 text-purple-600" />
            <span className="text-purple-700">Analitikler</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center border-green-200 hover:bg-green-50"
            onClick={() => router.push("/stores")}
          >
            <Store className="w-6 h-6 mb-2 text-green-600" />
            <span className="text-green-700">Mağaza Ayarları</span>
          </Button>
        </div>
      </main>
    </div>
  )
}
