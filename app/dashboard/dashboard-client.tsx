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
}

export default function DashboardClient({ user, profile, dashboardData }: DashboardClientProps) {
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState("30d")
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
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
    setLastRefresh(new Date())
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
  
  // Veri yenileme fonksiyonu
  const refreshData = async () => {
    try {
      if (refreshing) return // Zaten yenileme işlemi devam ediyorsa çık
      
      setRefreshing(true)
      setRefreshStatus({ message: "Etsy verileri yenileniyor..." })
      
      // API'ye istek gönder
      const response = await fetch("/api/etsy/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          forceRefresh: true // Önbelleği temizle ve yeni veri çek
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Başarılı yenileme sonrası dashboard verilerini yeniden yükle
        router.refresh() // Next.js sayfayı yeniler ve en güncel verileri alır
        setLastRefresh(new Date())
        
        setRefreshStatus({
          success: true,
          message: "Etsy verileri başarıyla yenilendi"
        })
      } else {
        setRefreshStatus({
          success: false,
          message: `Yenileme hatası: ${result.message}`
        })
        console.error("Veri yenileme hatası:", result.message)
      }
    } catch (error) {
      setRefreshStatus({
        success: false,
        message: "Veri yenileme sırasında bir hata oluştu"
      })
      console.error("Veri yenileme hatası:", error)
    } finally {
      setRefreshing(false)
      
      // 5 saniye sonra bildirim mesajını temizle
      setTimeout(() => {
        setRefreshStatus({})
      }, 5000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-16 md:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 bg-blue-600 flex items-center justify-center md:justify-start px-4">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
            <span className="text-blue-600 font-bold text-lg">E</span>
          </div>
          <span className="hidden md:block text-white font-bold ml-3">DolphinManager</span>
        </div>
        
        <div className="flex flex-col flex-grow p-4 space-y-2">
          <Button 
            variant="ghost" 
            className="justify-start bg-blue-50 text-blue-700" 
            onClick={() => router.push("/dashboard")}
          >
            <BarChart3 className="w-5 h-5 mr-3" />
            <span className="hidden md:inline">Dashboard</span>
          </Button>
          
          <Button 
            variant="ghost" 
            className="justify-start" 
            onClick={() => router.push("/products")}
          >
            <Package className="w-5 h-5 mr-3" />
            <span className="hidden md:inline">Ürünler</span>
          </Button>
          
          <Button 
            variant="ghost" 
            className="justify-start" 
            onClick={() => router.push("/orders")}
          >
            <ShoppingCart className="w-5 h-5 mr-3" />
            <span className="hidden md:inline">Siparişler</span>
          </Button>
          
          <Button 
            variant="ghost" 
            className="justify-start" 
            onClick={() => router.push("/analytics")}
          >
            <TrendingUp className="w-5 h-5 mr-3" />
            <span className="hidden md:inline">Analitikler</span>
          </Button>
          
          <Button 
            variant="ghost" 
            className="justify-start" 
            onClick={() => router.push("/stores")}
          >
            <Store className="w-5 h-5 mr-3" />
            <span className="hidden md:inline">Mağazalar</span>
          </Button>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <StoreSelector
            stores={stores}
            selectedStore={selectedStore}
            onStoreChange={handleStoreChange}
            showAddStore={true}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={refreshData} 
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  disabled={refreshing}
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Yenileniyor...' : 'Verileri Güncelle'}
                </Button>
                <div className="bg-blue-50 px-4 py-2 rounded-md text-blue-700 flex items-center space-x-2 border border-blue-200">
                  <Store className="w-4 h-4" />
                  <span className="font-semibold">{currentStore?.shop_name || "Mağaza"}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
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
          
          {/* Son yenileme bilgisi */}
          {lastRefresh && (
            <div className="text-xs text-gray-500 mb-6 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Son yenileme: {lastRefresh.toLocaleString()}
              <span className="mx-2">•</span>
              <span>Otomatik yenileme: 3 saatte bir</span>
            </div>
          )}
          
          {/* Modern Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="bg-blue-500 p-2 rounded-lg mr-3">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium text-blue-900">Aktif Ürünler</span>
                  </div>
                  {(currentStore?.listing_active_count > 0) && 
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                      %{dashboardData.listingsChange || 0}
                    </Badge>
                  }
                </div>
                <div className="flex items-end">
                  <span className="text-3xl font-bold text-blue-900">{currentStore?.listing_active_count || 0}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="bg-purple-500 p-2 rounded-lg mr-3">
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium text-purple-900">Toplam Satış</span>
                  </div>
                  {(dashboardData.orders > 0) && 
                    <Badge className={`${dashboardData.ordersChange >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} hover:bg-opacity-80`}>
                      {dashboardData.ordersChange >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                      %{Math.abs(dashboardData.ordersChange || 0)}
                    </Badge>
                  }
                </div>
                <div className="flex items-end">
                  <span className="text-3xl font-bold text-purple-900">{dashboardData.orders || 0}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl shadow-sm border border-amber-200">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="bg-amber-500 p-2 rounded-lg mr-3">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium text-amber-900">Ortalama Değerlendirme</span>
                  </div>
                </div>
                <div className="flex items-end">
                  <span className="text-3xl font-bold text-amber-900">
                    {currentStore?.review_average ? currentStore.review_average.toFixed(1) : '-'}
                  </span>
                  <span className="text-xs ml-2 text-amber-800 self-end mb-1">
                    ({currentStore?.review_count || 0} değerlendirme)
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="bg-green-500 p-2 rounded-lg mr-3">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium text-green-900">Ortalama Sipariş</span>
                  </div>
                  {(storeData.avg_order_value > 0) && 
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                      ₺{storeData.avg_order_value}
                    </Badge>
                  }
                </div>
                <div className="flex items-end">
                  <span className="text-3xl font-bold text-green-900">
                    {storeData.orders ? (storeData.orders / (timeRange === '30d' ? 1 : timeRange === '7d' ? 30/7 : 90/30)).toFixed(1) : 0}
                  </span>
                  <span className="text-xs ml-2 text-green-800 self-end mb-1">aylık</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Secondary Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-700">Günlük Ortalama</h3>
                <Badge variant="outline" className="text-xs">Son {timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90} gün</Badge>
              </div>
              <div className="flex items-center">
                <div className="mr-4">
                  <span className="text-2xl font-bold text-gray-800">
                    {storeData.orders ? (storeData.orders / (timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 90)).toFixed(1) : 0}
                  </span>
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${Math.min(100, storeData.orders ? (storeData.orders / (timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 90)) * 10 : 0)}%` }} 
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-700">Dönüşüm Oranı</h3>
                <Badge 
                  className={`${dashboardData.conversionChange >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {dashboardData.conversionChange >= 0 ? 
                    <ArrowUpRight className="w-3 h-3 mr-1" /> : 
                    <ArrowDownRight className="w-3 h-3 mr-1" />
                  }
                  %{Math.abs(dashboardData.conversionChange || 0)}
                </Badge>
              </div>
              <div className="flex items-center">
                <div className="mr-4">
                  <span className="text-2xl font-bold text-gray-800">%{storeData.conversion_rate}</span>
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${parseFloat(storeData.conversion_rate) >= 2 ? 'bg-green-500' : parseFloat(storeData.conversion_rate) >= 1 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                    style={{ width: `${Math.min(100, parseFloat(storeData.conversion_rate) * 20)}%` }} 
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-700">Toplam Gelir</h3>
                <Badge 
                  className={`${dashboardData.revenueChange >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {dashboardData.revenueChange >= 0 ? 
                    <ArrowUpRight className="w-3 h-3 mr-1" /> : 
                    <ArrowDownRight className="w-3 h-3 mr-1" />
                  }
                  %{Math.abs(dashboardData.revenueChange || 0)}
                </Badge>
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-800">₺{storeData.revenue.toLocaleString()}</span>
                <p className="text-xs text-gray-500 mt-1">Son {timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90} gün</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Satış Performansı</CardTitle>
                    <CardDescription>Sipariş ve gelir analizi</CardDescription>
                  </div>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="border border-gray-200 rounded-md px-3 py-1.5 text-sm bg-white"
                  >
                    <option value="7d">Son 7 Gün</option>
                    <option value="30d">Son 30 Gün</option>
                    <option value="90d">Son 90 Gün</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" orientation="left" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #f0f0f0',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }} 
                      />
                      <Bar yAxisId="left" dataKey="orders" fill="#4f46e5" name="Siparişler" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Gelir (₺)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Henüz veri yok</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Ürün Performansı</CardTitle>
                    <CardDescription>Görüntülenme ve dönüşüm analizi</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #f0f0f0',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="views" 
                        stroke="#6366f1" 
                        strokeWidth={2} 
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Görüntülenme" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="favorites" 
                        stroke="#f59e0b" 
                        strokeWidth={2} 
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Favorilere Eklenme" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <Eye className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Henüz veri yok</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card className="border-0 shadow-sm mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Performans Metrikleri</CardTitle>
              <CardDescription>Mağazanızın başlıca performans göstergeleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Dönüşüm Oranı</h3>
                    {dashboardData.conversionChange >= 0 ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        {dashboardData.conversionChange}%
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                        {Math.abs(dashboardData.conversionChange)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">%{storeData.conversion_rate}</p>
                  <p className="text-xs text-gray-500 mt-1">Son 30 günde</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Toplam Gelir</h3>
                    {dashboardData.revenueChange >= 0 ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        {dashboardData.revenueChange}%
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                        {Math.abs(dashboardData.revenueChange)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">₺{storeData.revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Son 30 günde</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Görüntülenme</h3>
                    {dashboardData.viewsChange >= 0 ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        {dashboardData.viewsChange}%
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                        {Math.abs(dashboardData.viewsChange)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">{storeData.views.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Son 30 günde</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-600">Siparişler</h3>
                    {dashboardData.ordersChange >= 0 ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        {dashboardData.ordersChange}%
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                        {Math.abs(dashboardData.ordersChange)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">{storeData.orders}</p>
                  <p className="text-xs text-gray-500 mt-1">Son 30 günde</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center border-blue-200 hover:bg-blue-50"
              onClick={() => router.push("/products")}
            >
              <Package className="w-6 h-6 mb-2 text-blue-600" />
              <span className="text-blue-700">Ürünleri Yönet</span>
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
              className="h-20 flex flex-col items-center justify-center border-blue-200 hover:bg-blue-50"
              onClick={() => router.push("/analytics")}
            >
              <BarChart3 className="w-6 h-6 mb-2 text-blue-600" />
              <span className="text-blue-700">Analitikler</span>
            </Button>

            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center border-blue-200 hover:bg-blue-50"
              onClick={() => router.push("/stores")}
            >
              <Store className="w-6 h-6 mb-2 text-blue-600" />
              <span className="text-blue-700">Mağaza Ayarları</span>
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}
