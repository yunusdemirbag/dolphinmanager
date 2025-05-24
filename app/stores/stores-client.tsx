"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Store,
  Plus,
  ExternalLink,
  BarChart3,
  Package,
  Star,
  Users,
  Settings,
  RefreshCw,
  Crown,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Eye,
  ShoppingCart,
} from "lucide-react"
import { useRouter } from "next/navigation"

interface StoresClientProps {
  user: any
  storesData: {
    stores: any[]
    profile: any
  }
}

export default function StoresClient({ user, storesData }: StoresClientProps) {
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Mock enhanced store data
  const stores = [
    {
      id: "1",
      shop_name: "ArtisanCrafts",
      title: "Handmade ceramic and pottery items",
      listing_active_count: 45,
      num_favorers: 1250,
      is_active: true,
      review_average: 4.8,
      review_count: 156,
      currency_code: "USD",
      url: "https://etsy.com/shop/artisancrafts",
      last_synced_at: new Date().toISOString(),
      image_url: null,
      // Performance data
      monthly_revenue: 12450,
      monthly_orders: 89,
      monthly_views: 8900,
      conversion_rate: 1.2,
      trend: "up",
    },
    {
      id: "2",
      shop_name: "VintageFinds",
      title: "Curated vintage clothing and accessories",
      listing_active_count: 32,
      num_favorers: 890,
      is_active: true,
      review_average: 4.6,
      review_count: 98,
      currency_code: "USD",
      url: "https://etsy.com/shop/vintagefinds",
      last_synced_at: new Date().toISOString(),
      image_url: null,
      monthly_revenue: 8750,
      monthly_orders: 56,
      monthly_views: 5600,
      conversion_rate: 1.0,
      trend: "down",
    },
    {
      id: "3",
      shop_name: "HandmadeJewelry",
      title: "Custom sterling silver jewelry",
      listing_active_count: 28,
      num_favorers: 2100,
      is_active: true,
      review_average: 4.9,
      review_count: 203,
      currency_code: "USD",
      url: "https://etsy.com/shop/handmadejewelry",
      last_synced_at: new Date().toISOString(),
      image_url: null,
      monthly_revenue: 15600,
      monthly_orders: 112,
      monthly_views: 12300,
      conversion_rate: 0.9,
      trend: "up",
    },
    {
      id: "4",
      shop_name: "CeramicStudio",
      title: "Modern ceramic dinnerware and decor",
      listing_active_count: 67,
      num_favorers: 1580,
      is_active: true,
      review_average: 4.7,
      review_count: 234,
      currency_code: "USD",
      url: "https://etsy.com/shop/ceramicstudio",
      last_synced_at: new Date().toISOString(),
      image_url: null,
      monthly_revenue: 18900,
      monthly_orders: 145,
      monthly_views: 15600,
      conversion_rate: 1.4,
      trend: "up",
    },
    {
      id: "5",
      shop_name: "WoodworkShop",
      title: "Custom wooden furniture and decor",
      listing_active_count: 23,
      num_favorers: 456,
      is_active: false,
      review_average: 4.5,
      review_count: 67,
      currency_code: "USD",
      url: "https://etsy.com/shop/woodworkshop",
      last_synced_at: new Date().toISOString(),
      image_url: null,
      monthly_revenue: 5200,
      monthly_orders: 23,
      monthly_views: 3400,
      conversion_rate: 0.7,
      trend: "down",
    },
  ]

  const maxStores = 5
  const canAddMore = stores.length < maxStores

  const handleStoreSelect = (storeId: string) => {
    setSelectedStore(storeId)
    router.push(`/dashboard?store=${storeId}`)
  }

  const handleSwitchToStore = (storeId: string) => {
    // Store switching logic
    localStorage.setItem("selectedStore", storeId)
    router.push(`/dashboard`)
  }

  const handleAddStore = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/etsy/auth")
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error("Error adding store:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStoreStatusColor = (store: any) => {
    if (!store.is_active) return "bg-gray-500"
    if (store.listing_active_count === 0) return "bg-yellow-500"
    if (store.listing_active_count > 50) return "bg-green-500"
    return "bg-blue-500"
  }

  const getStoreStatusText = (store: any) => {
    if (!store.is_active) return "Pasif"
    if (store.listing_active_count === 0) return "Ürün Yok"
    if (store.listing_active_count > 50) return "Aktif"
    return "Düşük Stok"
  }

  const getTrendIcon = (trend: string) => {
    return trend === "up" ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
    )
  }

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
                <h1 className="text-2xl font-bold text-gray-900">Mağazalarım</h1>
                <p className="text-sm text-gray-600">
                  {stores.length}/{maxStores} mağaza bağlı
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button variant="outline" onClick={() => router.push("/analytics/stores")}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Tüm Analitikler
              </Button>
              {canAddMore && (
                <Button onClick={handleAddStore} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Mağaza Ekle
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Store Limit Info */}
        <Card className="mb-8 border-orange-200">
          <CardHeader className="bg-orange-50">
            <CardTitle className="flex items-center text-orange-900">
              <Crown className="w-5 h-5 mr-2 text-orange-600" />
              Mağaza Limiti
            </CardTitle>
            <CardDescription className="text-orange-700">
              Personal Access ile maksimum {maxStores} mağaza bağlayabilirsiniz
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Kullanılan Slot</span>
                <span className="text-sm text-gray-600">
                  {stores.length}/{maxStores}
                </span>
              </div>
              <Progress value={(stores.length / maxStores) * 100} className="h-2" />

              {!canAddMore && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    Maksimum mağaza limitine ulaştınız. Yeni mağaza eklemek için mevcut birini kaldırmanız gerekiyor.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stores Grid */}
        {stores.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Store className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz mağaza bağlamadınız</h3>
              <p className="text-gray-600 mb-6">
                Etsy mağazanızı bağlayarak ürünlerinizi ve siparişlerinizi yönetmeye başlayın
              </p>
              <Button onClick={handleAddStore} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                İlk Mağazanızı Bağlayın
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store, index) => (
              <Card
                key={store.id}
                className={`transition-all hover:shadow-lg border-l-4 ${
                  store.is_active ? "border-l-green-500" : "border-l-gray-400"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {store.image_url ? (
                        <img
                          src={store.image_url || "/placeholder.svg"}
                          alt={store.shop_name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <img src="/dolphin-logo.svg" alt="Store" className="w-8 h-8 opacity-70" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{store.shop_name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-1">{store.title}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge variant="secondary" className={`${getStoreStatusColor(store)} text-white border-0`}>
                        {getStoreStatusText(store)}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                          <Crown className="w-3 h-3 mr-1" />
                          Ana
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Performance Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <ShoppingCart className="w-4 h-4 mx-auto text-green-600 mb-1" />
                      <p className="text-sm font-semibold text-green-900">{store.monthly_orders}</p>
                      <p className="text-xs text-green-600">Sipariş</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <Eye className="w-4 h-4 mx-auto text-blue-600 mb-1" />
                      <p className="text-sm font-semibold text-blue-900">{(store.monthly_views / 1000).toFixed(1)}k</p>
                      <p className="text-xs text-blue-600">Görüntülenme</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <Package className="w-4 h-4 mx-auto text-purple-600 mb-1" />
                      <p className="text-sm font-semibold text-purple-900">{store.listing_active_count}</p>
                      <p className="text-xs text-purple-600">Ürün</p>
                    </div>
                  </div>

                  {/* Revenue & Trend */}
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-lg font-bold text-orange-900">₺{store.monthly_revenue.toLocaleString()}</p>
                      <p className="text-xs text-orange-600">Aylık gelir</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(store.trend)}
                      <span className="text-sm font-medium text-gray-700">%{store.conversion_rate}</span>
                    </div>
                  </div>

                  {/* Reviews */}
                  {store.review_count > 0 && (
                    <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="font-medium text-yellow-900">{store.review_average}</span>
                        <span className="text-sm text-yellow-600">({store.review_count})</span>
                      </div>
                      <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700">
                        <Users className="w-3 h-3 mr-1" />
                        {store.num_favorers}
                      </Badge>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleSwitchToStore(store.id)}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Bu Mağazaya Geç
                    </Button>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(store.url, "_blank")
                        }}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Etsy'de Aç
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Sync store data
                        }}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/stores/${store.id}/settings`)
                        }}
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add Store Card */}
            {canAddMore && (
              <Card className="border-dashed border-2 border-orange-300 hover:border-orange-400 transition-colors">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                    <Plus className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Yeni Mağaza Ekle</h3>
                  <p className="text-sm text-gray-600 mb-4">{maxStores - stores.length} slot kaldı</p>
                  <Button onClick={handleAddStore} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Mağaza Bağla
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Store Comparison */}
        {stores.length > 1 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Mağaza Karşılaştırması</CardTitle>
              <CardDescription>Tüm mağazalarınızın performans özeti</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Mağaza</th>
                      <th className="text-center py-2">Gelir</th>
                      <th className="text-center py-2">Siparişler</th>
                      <th className="text-center py-2">Görüntülenme</th>
                      <th className="text-center py-2">Dönüşüm</th>
                      <th className="text-center py-2">Durum</th>
                      <th className="text-center py-2">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store) => (
                      <tr key={store.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                              <img src="/dolphin-logo.svg" alt="Store" className="w-5 h-5 opacity-70" />
                            </div>
                            <div>
                              <p className="font-medium">{store.shop_name}</p>
                              <p className="text-sm text-gray-600">{store.currency_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-3">
                          <span className="font-semibold">₺{store.monthly_revenue.toLocaleString()}</span>
                        </td>
                        <td className="text-center py-3">
                          <span className="font-semibold">{store.monthly_orders}</span>
                        </td>
                        <td className="text-center py-3">
                          <span className="font-semibold">{store.monthly_views.toLocaleString()}</span>
                        </td>
                        <td className="text-center py-3">
                          <div className="flex items-center justify-center space-x-1">
                            {getTrendIcon(store.trend)}
                            <span>%{store.conversion_rate}</span>
                          </div>
                        </td>
                        <td className="text-center py-3">
                          <Badge variant="secondary" className={`${getStoreStatusColor(store)} text-white border-0`}>
                            {getStoreStatusText(store)}
                          </Badge>
                        </td>
                        <td className="text-center py-3">
                          <Button
                            size="sm"
                            onClick={() => handleSwitchToStore(store.id)}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <ArrowRight className="w-3 h-3 mr-1" />
                            Geç
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center border-orange-200 hover:bg-orange-50"
            onClick={() => router.push("/products")}
          >
            <Package className="w-6 h-6 mb-2 text-orange-600" />
            <span className="text-orange-700">Tüm Ürünler</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center border-blue-200 hover:bg-blue-50"
            onClick={() => router.push("/analytics/stores")}
          >
            <BarChart3 className="w-6 h-6 mb-2 text-blue-600" />
            <span className="text-blue-700">Mağaza Analitikleri</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center border-purple-200 hover:bg-purple-50"
            onClick={() => router.push("/bulk-operations")}
          >
            <RefreshCw className="w-6 h-6 mb-2 text-purple-600" />
            <span className="text-purple-700">Toplu İşlemler</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center border-green-200 hover:bg-green-50"
            onClick={() => router.push("/settings/stores")}
          >
            <Settings className="w-6 h-6 mb-2 text-green-600" />
            <span className="text-green-700">Mağaza Ayarları</span>
          </Button>
        </div>
      </main>
    </div>
  )
}
