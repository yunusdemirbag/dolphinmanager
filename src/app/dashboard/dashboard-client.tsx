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
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  MessageSquare,
  Settings,
} from "lucide-react"
import { useRouter } from "next/navigation"
import StoreSelector from "@/components/store-selector"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface DashboardClientProps {
  user: any
  profile: any
  dashboardData: any
  lastDataFetch?: Date | null // Son veri çekme zamanı
}

export default function DashboardClient({ user, profile, dashboardData, lastDataFetch }: DashboardClientProps) {
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState("30d")
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(lastDataFetch || null)
  const [refreshStatus, setRefreshStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({})

  // Gerçek mağaza verilerini kullan - demo veri yok
  const stores = dashboardData.stores || []
  const currentStore = stores.find((store: any) => store.id === selectedStore) || stores[0]

  useEffect(() => {
    if (!selectedStore && stores.length > 0) {
      setSelectedStore(stores[0].id)
    }
    
    // İlk sayfa yüklendiğinde son yenileme zamanını ayarla
    if (lastDataFetch) {
      setLastRefresh(lastDataFetch)
    } else {
      setLastRefresh(new Date())
    }
    
    // Seçili mağaza adını localStorage'a yaz
    if (typeof window !== "undefined" && selectedStore) {
      const current = stores.find((store: any) => store.id === selectedStore)
      if (current?.shop_name) {
        localStorage.setItem("selectedStoreName", current.shop_name)
      }
    }
  }, [selectedStore, stores, lastDataFetch])

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-5xl w-full mx-auto px-4 py-8">
        {/* Üst: Minimalist başlık */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-base font-medium shadow-sm">
                <Store className="w-5 h-5 mr-1 text-black" />
                {currentStore?.shop_name || "Mağaza"}
              </div>
            </div>
          </div>
        </div>

        {/* Yenileme durumu bildirimi */}
        {refreshStatus.message && (
          <div className={`mb-4 p-3 rounded border flex items-center ${
            refreshStatus.success === undefined
              ? 'bg-blue-50 border-blue-200 text-blue-700'  // Bilgi
              : refreshStatus.success
                ? 'bg-green-50 border-green-200 text-green-700'  // Başarılı
                : 'bg-red-50 border-red-200 text-red-700'  // Hata
          }`}>
            {refreshStatus.success === undefined ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : refreshStatus.success ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : (
              <AlertTriangle className="w-4 h-4 mr-2" />
            )}
            <span>{refreshStatus.message}</span>
          </div>
        )}

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-12">
          {/* Kutucuklar: hover'da shadow-lg ve scale efekti */}
          {[
            {
              icon: <Package className="w-7 h-7 text-blue-500 mb-2" />, label: "Aktif Ürünler", value: currentStore?.listing_active_count ?? '-',
            },
            {
              icon: <ShoppingCart className="w-7 h-7 text-purple-500 mb-2" />, label: "Toplam Satış", value: dashboardData.orders ?? '-',
            },
            {
              icon: <DollarSign className="w-7 h-7 text-green-500 mb-2" />, label: "Toplam Gelir", value: `₺${storeData.revenue?.toLocaleString() ?? '-'}`,
            },
            {
              icon: <BarChart3 className="w-7 h-7 text-pink-500 mb-2" />, label: "Harcanan Reklam", value: `₺${dashboardData.ad_spent?.toLocaleString() ?? '-'}`,
            },
            {
              icon: <Star className="w-7 h-7 text-yellow-500 mb-2" />, label: "Mağaza Puanı", value: currentStore?.review_average ? currentStore.review_average.toFixed(1) : '-',
            },
            {
              icon: <MessageSquare className="w-7 h-7 text-gray-500 mb-2" />, label: "Yorum Sayısı", value: currentStore?.review_count ?? '-',
            },
            {
              icon: <ShoppingCart className="w-7 h-7 text-indigo-500 mb-2" />, label: "Aylık Ortalama Sipariş", value: dashboardData.monthly_avg_orders ?? '-',
            },
            {
              icon: <ShoppingCart className="w-7 h-7 text-cyan-500 mb-2" />, label: "Günlük Ortalama Sipariş", value: dashboardData.daily_avg_orders ?? '-',
            },
            {
              icon: <TrendingUp className="w-7 h-7 text-orange-500 mb-2" />, label: "Dönüşüm Oranı", value: `%${storeData.conversion_rate ?? '-'}`,
            },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-7 flex flex-col items-start shadow-sm border border-gray-100 transition-all duration-200 hover:shadow-lg hover:scale-[1.03] cursor-pointer">
              {item.icon}
              <div className="text-xs text-gray-500 mb-1 font-medium">{item.label}</div>
              <div className="text-3xl font-extrabold text-gray-900">{item.value}</div>
            </div>
          ))}
        </div>
        {/* Orta: Satış ve Ürün Performansı Grafikleri */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-semibold text-gray-800">Satış Performansı</div>
              <div className="text-xs text-gray-400">Son 30 gün</div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #f0f0f0', borderRadius: '8px' }} />
                  <Bar dataKey="orders" fill="#4f46e5" name="Siparişler" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" fill="#10b981" name="Gelir (₺)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 text-base h-[180px] flex items-center justify-center">Henüz veri yok</div>
            )}
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="mb-4 font-semibold text-gray-800">Ürün Performansı</div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #f0f0f0', borderRadius: '8px' }} />
                  <Bar dataKey="views" fill="#6366f1" name="Görüntülenme" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="favorites" fill="#f59e0b" name="Favorilere Eklenme" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 text-base h-[180px] flex items-center justify-center">Henüz veri yok</div>
            )}
          </div>
        </div>
        {/* Alt: Performans Metrikleri ve Hızlı Aksiyonlar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-600">Dönüşüm Oranı</h3>
            </div>
            <p className="text-2xl font-bold">%{storeData.conversion_rate}</p>
            <p className="text-xs text-gray-500 mt-1">Son 30 günde</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-600">Toplam Gelir</h3>
            </div>
            <p className="text-2xl font-bold">₺{storeData.revenue.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Son 30 günde</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-600">Görüntülenme</h3>
            </div>
            <p className="text-2xl font-bold">{storeData.views?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Son 30 günde</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-600">Siparişler</h3>
            </div>
            <p className="text-2xl font-bold">{storeData.orders || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Son 30 günde</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center border-gray-300 hover:bg-gray-100"
            onClick={() => router.push("/products")}
          >
            <Package className="w-6 h-6 mb-2 text-black" />
            <span className="text-black">Ürünleri Yönet</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center border-gray-300 hover:bg-gray-100"
            onClick={() => router.push("/orders")}
          >
            <ShoppingCart className="w-6 h-6 mb-2 text-black" />
            <span className="text-black">Siparişler</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center border-gray-300 hover:bg-gray-100"
            onClick={() => router.push("/analytics")}
          >
            <BarChart3 className="w-6 h-6 mb-2 text-black" />
            <span className="text-black">Analitikler</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center border-gray-300 hover:bg-gray-100"
            onClick={() => router.push("/stores")}
          >
            <Store className="w-6 h-6 mb-2 text-black" />
            <span className="text-black">Mağaza Ayarları</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
