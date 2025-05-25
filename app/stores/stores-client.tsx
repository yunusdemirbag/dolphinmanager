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
  Heart
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
        console.log("Stores API response:", data);
        
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
        } else {
          // Gerçek mağaza yok - boş liste göster
          setStores([]);
          setEtsyConnected(false);
        }
      } else {
        // API hatası - boş liste göster
        console.error("API error:", response.status, response.statusText);
        setStores([]);
        setEtsyConnected(false);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      setStores([]);
      setEtsyConnected(false);
    } finally {
      setLoading(false);
    }
  }

  const handleConnectEtsy = () => {
    // PKCE için state oluştur
    const state = Math.random().toString(36).substring(2);
    sessionStorage.setItem('etsy_oauth_state', state);
    
    // Etsy OAuth URL'ini oluştur
    const etsyAuthUrl = new URL('https://www.etsy.com/oauth/connect');
    etsyAuthUrl.searchParams.append('response_type', 'code');
    etsyAuthUrl.searchParams.append('client_id', process.env.NEXT_PUBLIC_ETSY_CLIENT_ID as string);
    etsyAuthUrl.searchParams.append('redirect_uri', process.env.NEXT_PUBLIC_ETSY_REDIRECT_URI as string);
    etsyAuthUrl.searchParams.append('scope', 'shops_r shops_w listings_r listings_w listings_d transactions_r profile_r');
    etsyAuthUrl.searchParams.append('state', state);
    
    // Etsy'ye yönlendir
    window.location.href = etsyAuthUrl.toString();
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

  const handleDisconnectStore = async () => {
    setReconnecting(true)
    try {
      // Fetch the first store to disconnect
      const storeToDisconnect = stores?.[0]?.shop_id;
      
      if (!storeToDisconnect) {
        alert('Bağlantı kesilecek mağaza bulunamadı');
        return;
      }
      
      const response = await fetch(`/api/etsy/stores/${storeToDisconnect}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
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

  return (
    <div className="container pb-16 flex flex-col items-center min-h-screen bg-[#f7f8fa]">
      {/* Header section */}
      <div className="w-full flex flex-col items-center justify-center mt-8 mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-center text-gray-900 flex items-center gap-3">
          <Store className="h-9 w-9 text-blue-600" /> Etsy Mağazalarım
        </h1>
        <p className="text-lg text-gray-500 text-center mt-2">Canvas wall art mağazalarınızı yönetin</p>
        <div className="text-xs text-gray-400 mt-1">Son güncelleme: {lastUpdate || '-'}</div>
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl mb-10">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <span className="text-sm text-gray-500 mb-1">Toplam Mağaza</span>
          <span className="text-2xl font-bold text-blue-700 flex items-center gap-2"><Store className="h-6 w-6" />{totalStores}</span>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <span className="text-sm text-gray-500 mb-1">Toplam Ürün</span>
          <span className="text-2xl font-bold text-green-700 flex items-center gap-2"><Package className="h-6 w-6" />{totalProducts}</span>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <span className="text-sm text-gray-500 mb-1">Toplam Takipçi</span>
          <span className="text-2xl font-bold text-purple-700 flex items-center gap-2"><Heart className="h-6 w-6" />{totalFollowers}</span>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
          <span className="text-sm text-gray-500 mb-1">Aylık Gelir</span>
          <span className="text-2xl font-bold text-yellow-700 flex items-center gap-2"><DollarSign className="h-6 w-6" />${totalRevenue.toLocaleString()}</span>
        </div>
      </div>
      {/* Add store button */}
      <div className="w-full flex justify-end max-w-5xl mb-6">
        <Button onClick={handleConnectEtsy} size="lg" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border-0 text-white px-8 py-3 text-lg rounded-xl">
          <Store className="w-5 h-5 mr-2" />
          Yeni Mağaza Ekle
        </Button>
      </div>
      {/* Bağlı Mağazalar başlığı */}
      {stores.length > 0 && (
        <div className="w-full max-w-5xl mb-4">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Bağlı Mağazalar ({stores.length})</h2>
        </div>
      )}
      {/* Store list */}
      {loading ? (
        <div className="flex justify-center items-center min-h-[300px] w-full">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          <span className="ml-3 text-gray-500">Mağazalar yükleniyor...</span>
        </div>
      ) : stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl bg-white text-center mb-8 w-full max-w-2xl shadow-sm">
          <Store className="h-14 w-14 text-gray-300 mb-4" />
          <h3 className="text-2xl font-semibold mb-2">Henüz bir Etsy mağazanız bağlı değil</h3>
          <p className="text-gray-500 mb-6 max-w-md">
            Etsy mağazanızı bağlayarak ürünlerinizi, siparişlerinizi ve istatistiklerinizi tek bir yerden yönetebilirsiniz.
          </p>
          <Button onClick={handleConnectEtsy} size="lg" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border-0 text-white px-8 py-3 text-lg rounded-xl">
            <Store className="w-5 h-5 mr-2" />
            Etsy Mağazası Bağla
          </Button>
          <p className="text-xs text-gray-400 mt-4">
            Sadece bir kez giriş yapmanız gerekir. Verileriniz güvende tutulur.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
          {stores.map((store) => (
            <Card key={store.shop_id} className="relative group shadow-xl border-0 bg-white rounded-2xl p-0 flex flex-col min-h-[340px]">
              <div className="flex flex-col md:flex-row items-center gap-6 p-6">
                <img 
                  src={store.avatar_url || store.icon_url_fullxfull || `https://www.etsy.com/images/avatars/default_shop.png`} 
                  alt={`${store.title} Logo`} 
                  className="h-20 w-20 rounded-full border-4 border-white bg-white object-cover shadow-lg mb-2 md:mb-0"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://www.etsy.com/images/avatars/default_shop.png`;
                  }}
                />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <a href={store.url} target="_blank" rel="noopener noreferrer" className="text-lg font-bold text-blue-700 hover:underline flex items-center">
                      {store.title}
                      <ExternalLink className="h-4 w-4 ml-1 text-blue-400" />
                    </a>
                    {store.connection_status === 'connected' ? (
                      <Badge className="bg-green-100 text-green-700 ml-2">Bağlı</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 ml-2">Bağlantı Yok</Badge>
                    )}
                  </div>
                  <div className="flex gap-4 flex-wrap text-sm mt-1">
                    <span className="flex items-center gap-1 text-yellow-600 font-semibold"><Star className="h-4 w-4" />{store.review_average?.toFixed(2) || 0} <span className="text-gray-500">({store.review_count})</span></span>
                    <span className="flex items-center gap-1 text-purple-600 font-semibold"><Heart className="h-4 w-4" />{store.num_favorers}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col items-center">
                      <span className="text-xs text-gray-500">Aylık Gelir</span>
                      <span className="font-bold text-yellow-700">${store.monthly_revenue?.toLocaleString() || '-'}</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col items-center">
                      <span className="text-xs text-gray-500">Sipariş</span>
                      <span className="font-bold text-blue-700">{store.monthly_orders || '-'}</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col items-center">
                      <span className="text-xs text-gray-500">Görüntülenme</span>
                      <span className="font-bold text-green-700">{store.monthly_views || '-'}</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col items-center">
                      <span className="text-xs text-gray-500">Dönüşüm</span>
                      <span className="font-bold text-indigo-700">{store.conversion_rate ? `${store.conversion_rate}%` : '-'}</span>
                    </div>
                  </div>
                  {/* Aktif ürün barı */}
                  <div className="w-full mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Aktif Ürünler</span>
                      <span>{store.listing_active_count}/100</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (store.listing_active_count / 100) * 100)}%` }}></div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="bg-black text-white flex-1"><ArrowRight className="h-4 w-4 mr-1" /> Yönet</Button>
                    <Button size="sm" variant="outline" onClick={handleRefreshStores}><RefreshCw className="h-4 w-4 mr-1" /> Yenile</Button>
                    <Button size="sm" variant="outline" onClick={handleResetEtsyConnection}><Unlink className="h-4 w-4 mr-1" /> Bağlantıyı Sıfırla</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
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
            <Button variant="outline" onClick={() => setDisconnectDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDisconnectStore} disabled={reconnecting}>
              {reconnecting ? <Loader2 className="w-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
              Bağlantıyı Kes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
