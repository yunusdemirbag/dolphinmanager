"use client"

import { useState, useEffect } from "react"
import { createClientSupabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Loader2, 
  Store, 
  Package, 
  ShoppingBag, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Eye,
  DollarSign,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Star,
  Calendar,
  Target,
  Zap,
  Award,
  Activity
} from "lucide-react"
import { useRouter } from "next/navigation"

interface CalendarEvent {
  date: string
  name: string
  description: string
  themes: string[]
  colors: string[]
  daysUntil: number
  priority: "high" | "medium" | "low"
  businessImpact: string
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [currentStore, setCurrentStore] = useState<string>("Canvas Dreams Studio")
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    views: 0
  })
  const supabase = createClientSupabase()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Seçili mağazayı localStorage'dan al
        const selectedStoreId = localStorage.getItem("selectedStore")
        
        // Mock store data - gerçek uygulamada API'den gelecek
        const stores = {
          "1": "Canvas Dreams Studio",
          "2": "Modern Wall Art Co",
          "3": "Nature Canvas Art", 
          "4": "Minimalist Canvas",
          "5": "Vintage Prints Hub"
        }
        
        if (selectedStoreId && stores[selectedStoreId as keyof typeof stores]) {
          setCurrentStore(stores[selectedStoreId as keyof typeof stores])
        }

        // Profil bilgilerini getir
        const { data: profileData } = await supabase.from("profiles").select("*").single()
        setProfile(profileData)

        // Gerçek Etsy verilerini çekmeye çalış
        try {
          const response = await fetch('/api/etsy/stats', {
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
          })
          
          if (response.ok) {
            const etsyStats = await response.json()
            
            setStats({
              products: etsyStats.totalListings || 25,
              orders: etsyStats.totalOrders || 8,
              views: etsyStats.totalViews || 1420
            })
          } else {
            // API'den veri çekilemezse mock data kullan
            setStats({
              products: 25,
              orders: 8,
              views: 1420
            })
          }
        } catch (apiError) {
          // Etsy API'den veri çekilemezse mock data kullan
          setStats({
            products: 25,
            orders: 8,
            views: 1420
          })
        }

        // Takvim etkinliklerini localStorage'dan yükle
        loadCalendarEventsFromStorage()
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const loadCalendarEventsFromStorage = () => {
    try {
      const storedEvents = localStorage.getItem('calendarEvents')
      if (storedEvents) {
        const events = JSON.parse(storedEvents)
        setCalendarEvents(events)
      }
    } catch (error) {
      console.error("Error loading calendar events from storage:", error)
    }
  }

  const handleViewProducts = () => {
    router.push("/products")
  }

  const handleViewOrders = () => {
    router.push("/orders")
  }

  const handleViewAnalytics = () => {
    router.push("/analytics")
  }

  // En yakın etkinliği al
  const nextEvent = calendarEvents.length > 0 ? calendarEvents[0] : null

  // Diğer bildirimler için sabit içerik
  const staticNotifications = [
    {
      id: "performance",
      type: "success",
      message: "Bu hafta satışlarınız %15 arttı! Harika gidiyorsunuz",
      icon: TrendingUp,
      color: "bg-green-50 border-green-400 text-green-800"
    },
    {
      id: "seo",
      type: "info", 
      message: "3 ürününüzün SEO skoru düşük. Optimizasyon önerilerimizi inceleyin",
      icon: Target,
      color: "bg-blue-50 border-blue-400 text-blue-800"
    }
  ]

  // Mock data for enhanced dashboard
  const recentActivities = [
    { id: 1, type: "sale", message: "Yeni sipariş: Minimalist Canvas Art", time: "2 dakika önce", icon: ShoppingBag, color: "text-green-600" },
    { id: 2, type: "product", message: "Ürün güncellendi: Botanical Print Set", time: "15 dakika önce", icon: Package, color: "text-blue-600" },
    { id: 3, type: "view", message: "Ürününüz 50 kez görüntülendi", time: "1 saat önce", icon: Eye, color: "text-purple-600" },
    { id: 4, type: "review", message: "5 yıldızlı yorum aldınız", time: "3 saat önce", icon: Star, color: "text-yellow-600" },
  ]

  const weeklyStats = [
    { day: "Pzt", sales: 12, views: 145 },
    { day: "Sal", sales: 8, views: 120 },
    { day: "Çar", sales: 15, views: 180 },
    { day: "Per", sales: 22, views: 210 },
    { day: "Cum", sales: 18, views: 165 },
    { day: "Cmt", sales: 25, views: 280 },
    { day: "Paz", sales: 20, views: 190 },
  ]

  const topProducts = [
    { name: "Minimalist Mountain Canvas", sales: 45, revenue: 1350, trend: "up" },
    { name: "Botanical Print Collection", sales: 32, revenue: 960, trend: "up" },
    { name: "Abstract Art Series", sales: 28, revenue: 840, trend: "down" },
    { name: "Vintage Poster Set", sales: 15, revenue: 450, trend: "up" },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with User Info */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-semibold text-gray-900">{currentStore}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">CS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Dinamik Yaklaşan Etkinlik - İlk Kart */}
            {nextEvent ? (
              <div className={`p-4 rounded-lg border-l-4 ${
                nextEvent.priority === 'high' ? 'bg-orange-50 border-orange-400' :
                nextEvent.priority === 'medium' ? 'bg-blue-50 border-blue-400' :
                'bg-green-50 border-green-400'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {nextEvent.priority === 'high' && <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />}
                    {nextEvent.priority === 'medium' && <Calendar className="h-5 w-5 text-blue-600 mr-2" />}
                    {nextEvent.priority === 'low' && <CheckCircle className="h-5 w-5 text-green-600 mr-2" />}
                    <div>
                      <p className={`text-sm font-medium ${
                        nextEvent.priority === 'high' ? 'text-orange-800' :
                        nextEvent.priority === 'medium' ? 'text-blue-800' :
                        'text-green-800'
                      }`}>
                        {nextEvent.name}
                      </p>
                      <p className={`text-xs ${
                        nextEvent.priority === 'high' ? 'text-orange-600' :
                        nextEvent.priority === 'medium' ? 'text-blue-600' :
                        'text-green-600'
                      }`}>
                        {nextEvent.daysUntil} gün kaldı
                      </p>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${
                    nextEvent.priority === 'high' ? 'text-orange-600' :
                    nextEvent.priority === 'medium' ? 'text-blue-600' :
                    'text-green-600'
                  }`}>
                    {nextEvent.daysUntil}
                  </div>
                </div>
                <p className={`text-xs mt-2 ${
                  nextEvent.priority === 'high' ? 'text-orange-700' :
                  nextEvent.priority === 'medium' ? 'text-blue-700' :
                  'text-green-700'
                }`}>
                  {nextEvent.description}
                </p>
                {nextEvent.themes && nextEvent.themes.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium mb-1">Önerilen Temalar:</p>
                    <div className="flex flex-wrap gap-1">
                      {nextEvent.themes.slice(0, 2).map((theme, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg border-l-4 bg-gray-50 border-gray-400">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Yaklaşan Özel Günler</p>
                    <p className="text-xs text-gray-600">Dolphin AI'dan güncel bilgileri alın</p>
                  </div>
                </div>
                <Button 
                  onClick={() => router.push("/dolphin-ai")} 
                  size="sm" 
                  className="mt-2 w-full"
                  variant="outline"
                >
                  Dolphin AI'ya Git
                </Button>
              </div>
            )}

            {/* Statik Bildirimler - 2. ve 3. Kartlar */}
            {staticNotifications.map((notification) => {
              const IconComponent = notification.icon
              return (
                <div key={notification.id} className={`p-4 rounded-lg border-l-4 ${notification.color}`}>
                  <div className="flex items-center">
                    <IconComponent className="h-5 w-5 mr-2" />
                    <p className="text-sm font-medium">
                      {notification.message}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Package className="h-5 w-5 mr-2 text-blue-600" />
                Ürünler
              </CardTitle>
              <CardDescription>Aktif ürün sayısı</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stats.products}</div>
              <div className="flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-green-600">+12%</span>
                <span className="text-gray-600 ml-1">bu ay</span>
              </div>
              <Button onClick={handleViewProducts} className="w-full mt-4" size="sm">
                Ürünleri Görüntüle
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2 text-green-600" />
                Siparişler
              </CardTitle>
              <CardDescription>Bu ay toplam</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stats.orders}</div>
              <div className="flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-green-600">+8%</span>
                <span className="text-gray-600 ml-1">geçen aya göre</span>
              </div>
              <Button onClick={handleViewOrders} className="w-full mt-4" size="sm">
                Siparişleri Görüntüle
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Eye className="h-5 w-5 mr-2 text-purple-600" />
                Görüntülenme
              </CardTitle>
              <CardDescription>Bu hafta toplam</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stats.views.toLocaleString()}</div>
              <div className="flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-green-600">+15%</span>
                <span className="text-gray-600 ml-1">geçen haftaya göre</span>
              </div>
              <Button onClick={handleViewAnalytics} className="w-full mt-4" size="sm">
                Analitikleri Görüntüle
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-orange-600" />
                Gelir
              </CardTitle>
              <CardDescription>Bu ay toplam</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">₺12,450</div>
              <div className="flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-green-600">+22%</span>
                <span className="text-gray-600 ml-1">hedef aşıldı</span>
              </div>
              <Button onClick={() => router.push("/finance")} className="w-full mt-4" size="sm">
                Finans Detayları
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Weekly Performance Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                Haftalık Performans
              </CardTitle>
              <CardDescription>Satış ve görüntülenme trendleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyStats.map((day, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-8 text-sm font-medium text-gray-600">{day.day}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Satış: {day.sales}</span>
                        <span>Görüntülenme: {day.views}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Progress value={(day.sales / 30) * 100} className="flex-1 h-2" />
                        <Progress value={(day.views / 300) * 100} className="flex-1 h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-green-600" />
                Son Aktiviteler
              </CardTitle>
              <CardDescription>Güncel işlemler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full bg-gray-100 ${activity.color}`}>
                      <activity.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Products and Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2 text-yellow-600" />
                En Çok Satan Ürünler
              </CardTitle>
              <CardDescription>Bu ayki performans liderleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">{product.sales} satış • ₺{product.revenue}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {product.trend === "up" ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-purple-600" />
                Aylık Hedefler
              </CardTitle>
              <CardDescription>İlerleme durumu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Satış Hedefi</span>
                    <span>120 / 150</span>
                  </div>
                  <Progress value={80} className="h-3" />
                  <p className="text-xs text-gray-600 mt-1">%80 tamamlandı</p>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Gelir Hedefi</span>
                    <span>₺12,450 / ₺15,000</span>
                  </div>
                  <Progress value={83} className="h-3" />
                  <p className="text-xs text-gray-600 mt-1">%83 tamamlandı</p>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Yeni Ürün</span>
                    <span>8 / 10</span>
                  </div>
                  <Progress value={80} className="h-3" />
                  <p className="text-xs text-gray-600 mt-1">2 ürün daha ekleyin</p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Müşteri Memnuniyeti</span>
                    <span>4.8 / 5.0</span>
                  </div>
                  <Progress value={96} className="h-3" />
                  <p className="text-xs text-gray-600 mt-1">Mükemmel performans!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Hızlı İşlemler</CardTitle>
            <CardDescription>Sık kullanılan özellikler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/products")}>
                <CardContent className="p-6 text-center">
                  <Package className="h-8 w-8 mx-auto mb-3 text-blue-600" />
                  <h3 className="font-semibold mb-1">Ürün Ekle</h3>
                  <p className="text-sm text-gray-600">Yeni canvas tasarımı ekle</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/dolphin-ai")}>
                <CardContent className="p-6 text-center">
                  <Zap className="h-8 w-8 mx-auto mb-3 text-purple-600" />
                  <h3 className="font-semibold mb-1">AI Önerileri</h3>
                  <p className="text-sm text-gray-600">Satış artırıcı öneriler al</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/costs")}>
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto mb-3 text-green-600" />
                  <h3 className="font-semibold mb-1">Maliyet Hesapla</h3>
                  <p className="text-sm text-gray-600">Kar marjını optimize et</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/finance")}>
                <CardContent className="p-6 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-3 text-orange-600" />
                  <h3 className="font-semibold mb-1">Finans Takibi</h3>
                  <p className="text-sm text-gray-600">Gelir gider analizi</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
