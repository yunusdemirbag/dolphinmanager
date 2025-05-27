"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  DollarSign,
  Loader2,
  LogOut,
  AlertTriangle,
  RotateCcw,
  Check,
  Heart,
  Clock
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClientSupabase } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import CurrentStoreNameBadge from "../components/CurrentStoreNameBadge"
import { RateLimitIndicator } from "@/components/ui/rate-limit-indicator"

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
  avatar_url?: string
  icon_url_fullxfull?: string
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
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [currentStore, setCurrentStore] = useState<EtsyStore | null>(null)
  const [refreshStatus, setRefreshStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({})
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
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
    setConnectionError(null) // Reset any previous connection errors
    try {
      // Gerçek Etsy mağaza verilerini çekmeye çalış
      const response = await fetch('/api/etsy/stores', { credentials: 'include' })
      if (response.status === 401) {
        setSessionExpired(true)
        setStores([])
        setEtsyConnected(false)
        setLoading(false)
        return
      }
      if (response.ok) {
        const data = await response.json()
        console.log("Stores API response:", data);
        
        // Check for connection errors
        if (data.error === "RECONNECT_REQUIRED") {
          setConnectionError("Etsy bağlantınız geçersiz olmuş. Lütfen yeniden bağlanın.")
          setStores([])
          setEtsyConnected(false)
          return
        }
        
        if (data.stores && data.stores.length > 0) {
          // Add connection_status property if not exists
          const enhancedStores = data.stores.map((store: any) => ({
            ...store,
            connection_status: store.connection_status || (data.source === 'database_fallback' ? 'connected' : 'connected'),
            // Default values for missing properties
            shop_id: store.shop_id || 0,
            shop_name: store.shop_name || 'Unknown',
            title: store.title || store.shop_name || 'Unknown Store',
            listing_active_count: store.listing_active_count || 0,
            num_favorers: store.num_favorers || 0,
            review_average: store.review_average || 0,
            review_count: store.review_count || 0
          }));
          
          setStores(enhancedStores);
          setEtsyConnected(true);
          setLastUpdate(new Date().toLocaleString('tr-TR'));
          setLastRefresh(new Date());
        } else {
          // Gerçek mağaza yok - boş liste göster
          setStores([]);
          setEtsyConnected(false);
          
          // Check if this is due to connection issues
          if (data.message) {
            setConnectionError(data.message);
          }
        }
      } else {
        // API hatası - boş liste göster
        console.error("API error:", response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        setConnectionError(errorData.message || "Etsy API bağlantı hatası oluştu.");
        setStores([]);
        setEtsyConnected(false);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      setConnectionError("Etsy bağlantısı sırasında bir hata oluştu. Lütfen tekrar deneyin.");
      setStores([]);
      setEtsyConnected(false);
    } finally {
      setLoading(false);
    }
  }

  const handleConnectEtsy = async () => {
    try {
      // API endpoint kullanarak Etsy auth URL'i al
      const response = await fetch("/api/etsy/auth")
      const data = await response.json()

      if (data.authUrl) {
        // Backend tarafından oluşturulan güvenli URL'e yönlendir
        window.location.href = data.authUrl
      } else {
        alert("Etsy bağlantı URL'i oluşturulamadı. Lütfen tekrar deneyin.")
      }
    } catch (error) {
      console.error("Etsy auth error:", error)
      alert("Etsy bağlantısı sırasında bir hata oluştu. Lütfen tekrar deneyin.")
    }
  };

  // Handle reconnecting to Etsy if the connection was lost
  const handleReconnectEtsy = async () => {
    setReconnecting(true)
    try {
      // First try to reset the existing connection
      await fetch('/api/etsy/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      
      // Then initialize a new connection
      const response = await fetch("/api/etsy/auth")
      const data = await response.json()

      if (data.authUrl) {
        // Navigate to the Etsy auth URL
        window.location.href = data.authUrl
      } else {
        alert("Etsy bağlantı URL'i oluşturulamadı. Lütfen tekrar deneyin.")
      }
    } catch (error) {
      console.error("Etsy reconnect error:", error)
      alert("Etsy yeniden bağlantısı sırasında bir hata oluştu. Lütfen tekrar deneyin.")
    } finally {
      setReconnecting(false)
    }
  };

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
        },
        credentials: 'include'
      })
      if (response.status === 401) {
        setSessionExpired(true)
        setResetting(false)
        return
      }
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
    try {
      if (refreshing) return; // Zaten yenileme işlemi devam ediyorsa çık
      
      // Son yenilemeden bu yana 5 dakika geçmediyse kullanıcıya sor
      if (lastRefresh && (Date.now() - lastRefresh.getTime() < 5 * 60 * 1000)) {
        const confirmRefresh = confirm(
          "Son yenilemeden henüz 5 dakika geçmedi. API çağrı limitlerini aşmamak için gereksiz yenilemeler yapmamaya özen gösterilmelidir. Yine de yenilemek istiyor musunuz?"
        );
        
        if (!confirmRefresh) return;
      }
      
      setRefreshing(true);
      setRefreshStatus({ message: "Etsy verileri yenileniyor..." });
      
      // API'ye istek gönder
      const response = await fetch("/api/etsy/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          forceRefresh: true // Önbelleği temizle ve yeni veri çek
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Başarılı yenileme sonrası mağaza verilerini yeniden yükle
        await loadStores();
        setLastRefresh(new Date());
        
        setRefreshStatus({
          success: true,
          message: "Etsy verileri başarıyla yenilendi"
        });
      } else {
        setRefreshStatus({
          success: false,
          message: `Yenileme hatası: ${result.message}`
        });
        console.error("Veri yenileme hatası:", result.message);
      }
    } catch (error) {
      setRefreshStatus({
        success: false,
        message: "Veri yenileme sırasında bir hata oluştu"
      });
      console.error("Veri yenileme hatası:", error);
    } finally {
      setRefreshing(false);
      
      // 5 saniye sonra bildirim mesajını temizle
      setTimeout(() => {
        setRefreshStatus({});
      }, 5000);
    }
  }

  const handleDisconnectStore = async () => {
    setReconnecting(true)
    try {
      const storeToDisconnect = stores?.[0]?.shop_id;
      if (!storeToDisconnect) {
        alert('Bağlantı kesilecek mağaza bulunamadı');
        return;
      }
      const response = await fetch(`/api/etsy/stores/${storeToDisconnect}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      if (response.status === 401) {
        setSessionExpired(true)
        setReconnecting(false)
        setDisconnectDialogOpen(false)
        return
      }
      if (response.ok) {
        setEtsyConnected(false)
        setStores([])
        alert('✅ Etsy bağlantısı başarıyla kesildi!')
        
        // Sayfayı yenile
        setTimeout(() => loadStores(), 1000)
      } else {
        const errorData = await response.json()
        console.error('Disconnect error:', errorData)
        alert(`Bağlantı kesme hatası: ${errorData.details || errorData.error}`)
      }
    } catch (error) {
      console.error('Error disconnecting Etsy store:', error)
      alert('Bağlantı kesme hatası: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setReconnecting(false)
      setDisconnectDialogOpen(false)
    }
  }

  const getConnectionStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
            <Check className="h-3 w-3 mr-1" />
            Bağlı
          </Badge>
        )
      case 'disconnected':
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-700 bg-orange-50">
            <Unlink className="h-3 w-3 mr-1" />
            Bağlantısız
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="border-gray-500 text-gray-700 bg-gray-50">
            <AlertCircle className="h-3 w-3 mr-1" />
            Bilinmiyor
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

  // Calculate summary stats
  const totalStores = stores.length;
  const totalProducts = stores.reduce((sum, s) => sum + (s.listing_active_count || 0), 0);
  const totalFollowers = stores.reduce((sum, s) => sum + (s.num_favorers || 0), 0);
  const totalRevenue = stores.reduce((sum, s) => sum + (s.monthly_revenue || 0), 0);

  const handleStoreSelect = (store: EtsyStore) => {
    setCurrentStore(store);
  }

  // Oturum süresi dolduysa kullanıcıya uyarı göster
  if (sessionExpired) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Alert className="mb-4" variant="destructive">
          <AlertTitle>Oturumunuz sona erdi</AlertTitle>
          <AlertDescription>
            Lütfen tekrar giriş yapın. Oturumunuz sona erdiği için mağaza işlemleri gerçekleştirilemiyor.
          </AlertDescription>
        </Alert>
        <Button className="bg-black text-white" onClick={() => window.location.href = '/login'}>
          Giriş Yap
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-2xl font-bold">Mağazalar</h1>
        <CurrentStoreNameBadge />
      </div>
      
      {/* Rate Limit Indicator */}
      <div className="mb-6">
        <RateLimitIndicator />
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
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="h-8 w-8 text-indigo-500" />
            Mağazalarım
          </h1>
          <div className='text-gray-500 text-sm mb-6'>{currentStore?.shop_name || 'Mağaza'}</div>
          <p className="text-gray-600 mt-2">Etsy mağazalarınızı tek yerden yönetin</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefreshStores} 
            disabled={refreshing}
            className="bg-black hover:bg-gray-800 text-white border-none"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {refreshing ? 'Yenileniyor...' : 'Verileri Güncelle'}
          </Button>
          <Button onClick={handleConnectEtsy} className="bg-black hover:bg-gray-800 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Mağaza Ekle
          </Button>
        </div>
      </div>

      {/* Son yenileme bilgisi */}
      {lastRefresh && (
        <div className="text-xs text-gray-500 mb-4 flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          Son yenileme: {lastRefresh.toLocaleString()}
        </div>
      )}

      {/* İstatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{totalStores}</div>
            <div className="text-sm text-gray-600">Toplam Mağaza</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{totalProducts}</div>
            <div className="text-sm text-gray-600">Toplam Ürün</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{totalFollowers}</div>
            <div className="text-sm text-gray-600">Toplam Takipçi</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">${totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Aylık Gelir</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Durum Bilgisi */}
      <div className="flex items-center text-sm text-gray-500 gap-2">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${etsyConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{etsyConnected ? 'Etsy Hesabı Bağlı' : 'Etsy Hesabı Bağlı Değil'}</span>
        </div>
        <div className="text-gray-400">•</div>
        <div>Son güncelleme: {lastUpdate || '-'}</div>
        {connectionError && (
          <>
            <div className="text-gray-400">•</div>
            <div className="text-red-500 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {connectionError}
            </div>
          </>
        )}
      </div>

      {/* Store Management */}
      {loading ? (
        <Card>
          <CardContent className="flex justify-center items-center min-h-[300px]">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              <p className="text-gray-500">Mağazalar yükleniyor...</p>
            </div>
          </CardContent>
        </Card>
      ) : stores.length === 0 ? (
        <Card className="bg-slate-50 border-2 border-dashed border-slate-200">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <Store className="h-12 w-12 text-slate-400" />
              <div>
                <h3 className="text-lg font-medium">Henüz Etsy Mağazanız Bağlı Değil</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Etsy hesabınızı bağlayarak mağazalarınızı ve ürünlerinizi yönetin.
                </p>
              </div>
              {connectionError ? (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Bağlantı Hatası</AlertTitle>
                  <AlertDescription>{connectionError}</AlertDescription>
                  <Button 
                    variant="outline" 
                    className="mt-2" 
                    onClick={handleReconnectEtsy}
                    disabled={reconnecting}
                  >
                    {reconnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Yeniden Bağlanılıyor...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Yeniden Bağlan
                      </>
                    )}
                  </Button>
                </Alert>
              ) : (
                <Button onClick={handleConnectEtsy} className="mt-2">
                  <Link className="mr-2 h-4 w-4" />
                  Etsy Hesabını Bağla
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mağaza Kartları */}
          <div className="grid grid-cols-1 gap-6">
            {stores.map((store) => (
              <Card key={store.shop_id} className="overflow-hidden border border-gray-200 hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Mağaza Görsel Alanı */}
                    <div className="w-full md:w-1/4 bg-gray-50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
                      <img 
                        src={store.avatar_url || store.icon_url_fullxfull || `https://www.etsy.com/images/avatars/default_shop.png`} 
                        alt={`${store.title} Logo`} 
                        className="h-24 w-24 rounded-full border-4 border-white bg-white object-cover shadow-lg mb-4"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://www.etsy.com/images/avatars/default_shop.png`;
                        }}
                      />
                      <h3 className="text-lg font-bold text-center mb-1">{store.title}</h3>
                      <div className="flex items-center gap-2 text-gray-500 mb-3">
                        <a href={store.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-indigo-600 flex items-center">
                          Etsy'de Görüntüle
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-600 mb-2">
                        <Star className="h-4 w-4" />
                        <span className="font-medium">{store.review_average?.toFixed(2) || 0}</span>
                        <span className="text-gray-500 text-sm">({store.review_count})</span>
                      </div>
                      {getConnectionStatusBadge(store.connection_status)}
                    </div>
                    
                    {/* Mağaza Detay Alanı */}
                    <div className="w-full md:w-3/4 p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sol Kısım - Temel Bilgiler */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Mağaza Bilgileri</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Mağaza Adı</span>
                                <span className="font-medium">{store.shop_name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Aktif Ürünler</span>
                                <span className="font-medium">{store.listing_active_count}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Takipçi Sayısı</span>
                                <span className="font-medium">{store.num_favorers}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Para Birimi</span>
                                <span className="font-medium">{store.currency_code}</span>
                              </div>
                            </div>
                          </div>

                          {/* Aktif ürün barı */}
                          <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Kapasite Kullanımı</span>
                              <span>{store.listing_active_count}/100</span>
                            </div>
                            <Progress value={Math.min(100, (store.listing_active_count / 100) * 100)} className="h-2" />
                          </div>
                        </div>

                        {/* Sağ Kısım - İstatistikler */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Performans İstatistikleri</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <Card className="bg-gray-50 border-none">
                              <CardContent className="p-3 text-center">
                                <div className="text-xs text-gray-500 mb-1">Aylık Gelir</div>
                                <div className="text-lg font-bold text-yellow-700 flex items-center justify-center gap-1">
                                  <DollarSign className="h-4 w-4" />
                                  {store.monthly_revenue?.toLocaleString() || '0'}
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="bg-gray-50 border-none">
                              <CardContent className="p-3 text-center">
                                <div className="text-xs text-gray-500 mb-1">Siparişler</div>
                                <div className="text-lg font-bold text-blue-700 flex items-center justify-center gap-1">
                                  <ShoppingCart className="h-4 w-4" />
                                  {store.monthly_orders || '0'}
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="bg-gray-50 border-none">
                              <CardContent className="p-3 text-center">
                                <div className="text-xs text-gray-500 mb-1">Görüntülenme</div>
                                <div className="text-lg font-bold text-green-700 flex items-center justify-center gap-1">
                                  <Eye className="h-4 w-4" />
                                  {store.monthly_views || '0'}
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="bg-gray-50 border-none">
                              <CardContent className="p-3 text-center">
                                <div className="text-xs text-gray-500 mb-1">Dönüşüm Oranı</div>
                                <div className="text-lg font-bold text-indigo-700 flex items-center justify-center gap-1">
                                  {getTrendIcon(store.trend)}
                                  {store.conversion_rate ? `${store.conversion_rate}%` : '0%'}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2 mt-6 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setDisconnectDialogOpen(true)} className="bg-black hover:bg-gray-800 text-white border-none">
                          <Unlink className="h-4 w-4 mr-1" />
                          Bağlantıyı Kes
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleResetEtsyConnection} className="bg-black hover:bg-gray-800 text-white border-none">
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Sıfırla
                        </Button>
                        <Button size="sm" className="bg-black hover:bg-gray-800 text-white">
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Yönet
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Disconnect Dialog */}
      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mağaza Bağlantısını Kes</DialogTitle>
            <DialogDescription>
              Bu işlem mağazanızın Dolphin Manager ile bağlantısını kesecektir. Verileriniz silinmeyecek, sadece eşleştirme kaldırılacaktır.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-amber-600 font-medium mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Bu işlemi gerçekleştirmek istediğinizden emin misiniz?
            </p>
            <p className="text-sm text-gray-500">
              Mağazanızı daha sonra tekrar bağlayabilirsiniz. Ancak mevcut senkronizasyon durumunuz sıfırlanacaktır.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialogOpen(false)} className="border-gray-300">
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDisconnectStore} disabled={reconnecting} className="bg-black hover:bg-gray-800 text-white border-none">
              {reconnecting ? <Loader2 className="w-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
              Bağlantıyı Kes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
