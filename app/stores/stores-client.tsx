"use client"

import { useState, useEffect } from "react"
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
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  Link,
  Unlink,
  Activity,
  DollarSign
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClientSupabase } from "@/lib/supabase"

interface EtsyStore {
  shop_id: number
  shop_name: string
  title: string
  listing_active_count: number
  num_favorers: number
  is_active: boolean
  review_average: number
  review_count: number
  currency_code: string
  url: string
  last_synced_at: string
  connection_status: 'connected' | 'disconnected' | 'error'
  monthly_revenue?: number
  monthly_orders?: number
  monthly_views?: number
  conversion_rate?: number
  trend?: 'up' | 'down' | 'stable'
}

interface StoresClientProps {
  user: any
  storesData: {
    stores: any[]
    profile: any
  }
}

export default function StoresClient({ user, storesData }: StoresClientProps) {
  const [stores, setStores] = useState<EtsyStore[]>([])
  const [loading, setLoading] = useState(true)
  const [etsyConnected, setEtsyConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientSupabase()

  useEffect(() => {
    loadStores()
    
    // URL parametrelerini kontrol et - Etsy callback'den gelen mesajlar
    const urlParams = new URLSearchParams(window.location.search)
    const etsyStatus = urlParams.get('etsy')
    const error = urlParams.get('error')
    const details = urlParams.get('details')
    const description = urlParams.get('description')
    
    if (etsyStatus === 'connected') {
      alert("✅ Etsy mağazanız başarıyla bağlandı!")
      // URL'yi temizle
      window.history.replaceState({}, '', '/stores')
      // Bağlantı durumunu yeniden kontrol et
      setTimeout(() => loadStores(), 1000)
    } else if (error) {
      let errorMessage = "❌ Etsy bağlantısında hata oluştu."
      
      if (error === 'missing_params') {
        errorMessage += "\n\nHata: Eksik parametreler. Lütfen tekrar deneyin."
      } else if (error === 'etsy_connection_failed') {
        errorMessage += "\n\nBağlantı başarısız oldu."
        if (details) {
          errorMessage += `\n\nDetay: ${decodeURIComponent(details)}`
        }
      } else if (description) {
        errorMessage += `\n\nDetay: ${decodeURIComponent(description)}`
      }
      
      alert(errorMessage)
      // URL'yi temizle
      window.history.replaceState({}, '', '/stores')
    }
  }, [])

  const loadStores = async () => {
    setLoading(true)
    try {
      // Gerçek Etsy mağaza verilerini çekmeye çalış
      const response = await fetch('/api/etsy/stores')
      
      if (response.ok) {
        const data = await response.json()
        if (data.stores && data.stores.length > 0) {
          // Gerçek mağaza verileri var - sadece bunları göster
          setStores(data.stores)
          setEtsyConnected(true)
          setLastUpdate(new Date().toLocaleString('tr-TR'))
        } else {
          // Gerçek mağaza yok - boş liste göster
          setStores([])
          setEtsyConnected(false)
        }
      } else {
        // API hatası - boş liste göster
        setStores([])
        setEtsyConnected(false)
      }
    } catch (error) {
      console.error('Error loading stores:', error)
      setStores([])
      setEtsyConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectEtsy = async () => {
    setReconnecting(true)
    try {
      const response = await fetch('/api/etsy/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const { authUrl } = await response.json()
        // Aynı sekmede Etsy OAuth'a yönlendir
        window.location.href = authUrl
      } else {
        const errorData = await response.json()
        console.error('Auth error:', errorData)
        alert(`Etsy bağlantısı başlatılamadı: ${errorData.details || errorData.error}`)
      }
    } catch (error) {
      console.error('Error connecting to Etsy:', error)
      alert('Bağlantı hatası: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setReconnecting(false)
    }
  }

  const handleResetEtsyConnection = async () => {
    if (!confirm('Etsy bağlantısını tamamen sıfırlamak istediğinizden emin misiniz? Bu işlem tüm token\'ları ve bağlantı verilerini silecektir.')) {
      return
    }

    setResetting(true)
    try {
      const response = await fetch('/api/etsy/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        alert('✅ Etsy bağlantısı başarıyla sıfırlandı! Şimdi yeniden bağlanabilirsiniz.')
        setEtsyConnected(false)
        setStores([])
        // Sayfayı yenile
        setTimeout(() => loadStores(), 1000)
      } else {
        const errorData = await response.json()
        console.error('Reset error:', errorData)
        alert(`Sıfırlama hatası: ${errorData.details || errorData.error}`)
      }
    } catch (error) {
      console.error('Error resetting Etsy connection:', error)
      alert('Sıfırlama hatası: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setResetting(false)
    }
  }

  const handleRefreshStores = async () => {
    setRefreshing(true)
    await loadStores()
    setRefreshing(false)
  }

  const handleDisconnectStore = async (shopId: number) => {
    if (confirm('Bu mağazanın bağlantısını kesmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`/api/etsy/stores/${shopId}/disconnect`, {
          method: 'POST'
        })
        
        if (response.ok) {
          await loadStores()
          alert('Mağaza bağlantısı kesildi')
        }
      } catch (error) {
        console.error('Error disconnecting store:', error)
        alert('Bağlantı kesilemedi')
      }
    }
  }

  const getConnectionStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            Bağlı
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">
            <XCircle className="h-3 w-3 mr-1" />
            Hata
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-700 bg-orange-50">
            <Unlink className="h-3 w-3 mr-1" />
            Bağlantısız
          </Badge>
        )
    }
  }

  const getStoreStatusColor = (store: EtsyStore) => {
    if (!store.is_active) return "bg-gray-500"
    if (store.connection_status === 'connected') return "bg-green-500"
    if (store.connection_status === 'error') return "bg-red-500"
    return "bg-orange-500"
  }

  const getStoreStatusText = (store: EtsyStore) => {
    if (!store.is_active) return "Pasif"
    if (store.connection_status === 'connected') return "Aktif"
    if (store.connection_status === 'error') return "Hata"
    return "Bağlantısız"
  }

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') {
      return <TrendingUp className="w-4 h-4 text-green-600" />
    } else if (trend === 'down') {
      return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
    }
    return <Activity className="w-4 h-4 text-gray-600" />
  }

  const connectedStores = stores.filter(s => s.connection_status === 'connected')
  const disconnectedStores = stores.filter(s => s.connection_status !== 'connected')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <Store className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Etsy Mağazalarım</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Canvas wall art mağazalarınızı yönetin
                  {lastUpdate && (
                    <span className="ml-2">• Son güncelleme: {lastUpdate}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Global Etsy Connection Status */}
              <div className="flex items-center space-x-2">
                {etsyConnected ? (
                  <Badge variant="outline" className="border-green-500 text-green-700">
                    <Wifi className="h-3 w-3 mr-1" />
                    Etsy Bağlı ({connectedStores.length})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-red-500 text-red-700">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Etsy Bağlantısız
                  </Badge>
                )}
              </div>
              <div className="flex space-x-2">
                {etsyConnected && (
                  <>
                    <button
                      onClick={handleRefreshStores}
                      disabled={refreshing}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
                    >
                      {refreshing ? 'Yenileniyor...' : 'Yenile'}
                    </button>
                    <button
                      onClick={handleResetEtsyConnection}
                      disabled={resetting}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
                    >
                      {resetting ? 'Sıfırlanıyor...' : 'Bağlantıyı Sıfırla'}
                    </button>
                  </>
                )}
                {!etsyConnected && (
                  <button
                    onClick={handleConnectEtsy}
                    disabled={reconnecting}
                    className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50"
                  >
                    {reconnecting ? 'Bağlanıyor...' : 'Etsy\'ye Bağlan'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Status Alert - Sadece gerçek bağlantı yoksa göster */}
        {!etsyConnected && (
          <div className="space-y-4 mb-6">
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>Etsy API bağlantısı yok</strong> - Gerçek mağaza verilerinizi görmek için Etsy hesabınızı bağlayın.
              </AlertDescription>
            </Alert>
            
            {/* Debug Panel */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-800 dark:text-blue-200">🔧 Bağlantı Sorun Giderme</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Adım 1: Bağlantıyı Sıfırla</h4>
                    <p className="text-xs mb-2">Eski token'ları temizle</p>
                    <button
                      onClick={handleResetEtsyConnection}
                      disabled={resetting}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
                    >
                      {resetting ? 'Sıfırlanıyor...' : '🗑️ Sıfırla'}
                    </button>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Adım 2: Yeniden Bağlan</h4>
                    <p className="text-xs mb-2">Etsy'de tüm izinleri ver</p>
                    <button
                      onClick={handleConnectEtsy}
                      disabled={reconnecting}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50"
                    >
                      {reconnecting ? 'Bağlanıyor...' : '🔗 Bağlan'}
                    </button>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border text-xs">
                  <h5 className="font-semibold mb-1">💡 Önemli Notlar:</h5>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                    <li>Etsy'de bağlantı sırasında <strong>tüm izinleri</strong> verin</li>
                    <li>Özellikle "mağaza bilgilerini okuma" iznini verin</li>
                    <li>Eğer hala çalışmazsa, Vercel loglarını kontrol edin</li>
                    <li>Sorun devam ederse, Etsy Developer hesabınızı kontrol edin</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Overview - Sadece gerçek mağazalar için */}
        {etsyConnected && connectedStores.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Mağaza</p>
                    <p className="text-2xl font-bold">{connectedStores.length}</p>
                  </div>
                  <Store className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Ürün</p>
                    <p className="text-2xl font-bold">
                      {connectedStores.reduce((sum, store) => sum + store.listing_active_count, 0)}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Takipçi</p>
                    <p className="text-2xl font-bold">
                      {connectedStores.reduce((sum, store) => sum + store.num_favorers, 0).toLocaleString()}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Aylık Gelir</p>
                    <p className="text-2xl font-bold">
                      ${connectedStores.reduce((sum, store) => sum + (store.monthly_revenue || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Connected Stores - Sadece gerçek bağlı mağazalar */}
        {connectedStores.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Bağlı Mağazalar ({connectedStores.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {connectedStores.map((store) => (
                <StoreCard 
                  key={store.shop_id} 
                  store={store} 
                  onDisconnect={handleDisconnectStore}
                  router={router}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State - Hiç mağaza yoksa */}
        {stores.length === 0 && !loading && (
          <div className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Mağaza bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Etsy mağazanızı bağlayarak başlayın.
            </p>
            <div className="mt-6">
              <Button onClick={handleConnectEtsy} disabled={reconnecting}>
                {reconnecting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                İlk Mağazanızı Bağlayın
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Mağazalar yükleniyor...</p>
          </div>
        )}
      </main>
    </div>
  )
}

// Store Card Component
function StoreCard({ 
  store, 
  onDisconnect, 
  router, 
  isDemo = false 
}: { 
  store: EtsyStore
  onDisconnect: (shopId: number) => void
  router: any
  isDemo?: boolean
}) {
  const getConnectionStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            Bağlı
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">
            <XCircle className="h-3 w-3 mr-1" />
            Hata
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-700 bg-orange-50">
            <Unlink className="h-3 w-3 mr-1" />
            {isDemo ? 'Demo' : 'Bağlantısız'}
          </Badge>
        )
    }
  }

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') {
      return <TrendingUp className="w-4 h-4 text-green-600" />
    } else if (trend === 'down') {
      return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
    }
    return <Activity className="w-4 h-4 text-gray-600" />
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{store.shop_name}</h3>
              <div className={`w-2 h-2 rounded-full ${
                store.connection_status === 'connected' ? 'bg-green-500' :
                store.connection_status === 'error' ? 'bg-red-500' : 'bg-orange-500'
              }`} />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{store.title}</p>
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center">
                <Star className="w-3 h-3 mr-1 text-yellow-500" />
                {store.review_average} ({store.review_count})
              </span>
              <span className="flex items-center">
                <Users className="w-3 h-3 mr-1" />
                {store.num_favorers.toLocaleString()}
              </span>
            </div>
          </div>
          {getConnectionStatusBadge(store.connection_status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Metrics */}
        {store.monthly_revenue && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Aylık Gelir</span>
                {getTrendIcon(store.trend)}
              </div>
              <div className="font-semibold text-green-600">${store.monthly_revenue.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Sipariş</div>
              <div className="font-semibold">{store.monthly_orders}</div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Görüntülenme</div>
              <div className="font-semibold">{store.monthly_views?.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Dönüşüm</div>
              <div className="font-semibold">{store.conversion_rate}%</div>
            </div>
          </div>
        )}

        {/* Products Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Aktif Ürünler</span>
            <span className="font-medium">{store.listing_active_count}/100</span>
          </div>
          <Progress value={(store.listing_active_count / 100) * 100} className="h-2" />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Button
            onClick={() => {
              localStorage.setItem("selectedStore", store.shop_id.toString())
              router.push("/dashboard")
            }}
            className="flex-1"
            size="sm"
            disabled={isDemo}
          >
            <ArrowRight className="w-3 h-3 mr-1" />
            {isDemo ? 'Demo' : 'Yönet'}
          </Button>
          <Button
            onClick={() => window.open(store.url, '_blank')}
            variant="outline"
            size="sm"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
          {store.connection_status === 'connected' && (
            <Button
              onClick={() => onDisconnect(store.shop_id)}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              <Unlink className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
