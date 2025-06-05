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
  Clock,
  Terminal,
  Database,
  Server,
  User
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClientSupabase } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import CurrentStoreNameBadge from "../components/CurrentStoreNameBadge"
import { RateLimitIndicator } from "@/components/ui/rate-limit-indicator"
import { useToast } from "@/hooks/use-toast"
import { Database as DatabaseTypes } from "@/types/database.types"
import { Separator } from "@/components/ui/separator"

interface EtsyStore {
  shop_id: number
  shop_name: string
  title: string | null
  announcement: string | null
  currency_code: string
  is_vacation: boolean
  listing_active_count: number
  num_favorers: number
  url: string
  image_url_760x100: string | null
  review_count: number
  review_average: number
  is_active?: boolean
  last_synced_at?: string
  avatar_url?: string | null
}

interface StoresClientProps {
  user: any
  storesData: {
    stores: EtsyStore[]
    profile: any
    error?: string
  }
}

export default function StoresClient({ user, storesData }: StoresClientProps) {
  const [loading, setLoading] = useState(false)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [stores, setStores] = useState<EtsyStore[]>(storesData.stores || [])
  const [connectionError, setConnectionError] = useState<string | null>(storesData.error || null)
  const router = useRouter()
  const { toast } = useToast()
  const [connecting, setConnecting] = useState(false)
  const [statusChecking, setStatusChecking] = useState(false)
  const [tokenCleaning, setTokenCleaning] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [isSetupVisible, setIsSetupVisible] = useState(false)

  const handleConnectEtsy = async () => {
    try {
      setConnecting(true)
      const response = await fetch("/api/etsy/auth-url")
      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("Etsy bağlantı URL'si alınamadı")
      }
    } catch (error) {
      console.error("Etsy bağlantı hatası:", error)
      toast({
        title: "Hata",
        description: "Etsy bağlantısı sırasında bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive"
      })
    } finally {
      setConnecting(false)
    }
  }

  const handleCheckStatus = async () => {
    setStatusChecking(true)
    
    try {
      const response = await fetch("/api/etsy/test", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      const result = await response.json()
      setTestResult(result)
      
      toast({
        title: result.success ? "Bağlantı Başarılı" : "Bağlantı Hatası",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      })
    } catch (error) {
      console.error("Error checking status:", error)
      toast({
        title: "Bağlantı Hatası",
        description: "Etsy bağlantısı kontrol edilirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setStatusChecking(false)
    }
  }

  const handleCleanupTokens = async () => {
    setTokenCleaning(true)
    
    try {
      const response = await fetch("/api/etsy/cleanup-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Token Temizleme Başarılı",
          description: "Etsy token kayıtları başarıyla temizlendi.",
          variant: "default",
        })
      } else {
        toast({
          title: "Token Temizleme Hatası",
          description: result.error || "Etsy token kayıtları temizlenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error cleaning tokens:", error)
      toast({
        title: "Token Temizleme Hatası",
        description: "Etsy token kayıtları temizlenirken bir hata oluştu.",
        variant: "destructive",
      })
    } finally {
      setTokenCleaning(false)
    }
  }

  const handleSetupEtsy = async () => {
    try {
      setDebugLoading(true)
      const response = await fetch("/api/etsy/setup")
      const data = await response.json()
      
      if (data.error) {
        toast({
          title: "Hata",
          description: `Etsy kurulumu yapılamadı: ${data.error}`,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Başarılı",
          description: data.message,
          variant: "default"
        })
        // Durum bilgisini güncelle
        await handleCheckStatus()
      }
    } catch (error) {
      console.error("Etsy kurulum hatası:", error)
      toast({
        title: "Hata",
        description: "Etsy kurulumu sırasında bir hata oluştu.",
        variant: "destructive"
      })
    } finally {
      setDebugLoading(false)
    }
  }

  // Mağaza bağlantısı yoksa veya hata varsa
  if (!loading && (stores.length === 0 || connectionError)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <Alert className="mb-4" variant={connectionError ? "destructive" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {connectionError ? "Mağaza Bağlantı Hatası" : "Mağaza Bağlantısı Gerekli"}
              </AlertTitle>
              <AlertDescription>
                {connectionError ? (
                  <div className="space-y-2">
                    <p>{connectionError}</p>
                    <p>Mağaza verilerinize erişebilmek için lütfen Etsy hesabınızı tekrar bağlayın.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p>Henüz bağlı bir Etsy mağazanız bulunmuyor.</p>
                    <p>Mağazanızı bağlayarak yönetmeye başlayabilirsiniz.</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
            <div className="mt-8 flex flex-col space-y-4">
              {storesData.stores && storesData.stores.length > 0 ? (
                <>
                  <Button
                    onClick={handleCheckStatus}
                    className="w-full md:w-auto"
                    disabled={statusChecking}
                  >
                    {statusChecking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Bağlantı Kontrol Ediliyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Bağlantıyı Kontrol Et
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleCleanupTokens}
                    variant="outline"
                    className="w-full md:w-auto"
                    disabled={tokenCleaning}
                  >
                    {tokenCleaning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Tokenler Temizleniyor...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Token Kayıtlarını Temizle
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => {
                      setDebugLoading(true);
                      fetch("/api/etsy/debug")
                        .then(res => res.json())
                        .then(data => {
                          setDebugInfo(data);
                          setShowDebug(true);
                          setDebugLoading(false);
                        })
                        .catch(err => {
                          console.error("Debug bilgisi alınamadı:", err);
                          toast({
                            title: "Hata",
                            description: "Debug bilgisi alınamadı.",
                            variant: "destructive"
                          });
                          setDebugLoading(false);
                        });
                    }}
                    variant="outline"
                    className="w-full md:w-auto"
                    disabled={debugLoading}
                  >
                    {debugLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Bilgiler Alınıyor...
                      </>
                    ) : (
                      <>
                        <Terminal className="mr-2 h-4 w-4" />
                        Bağlantı Bilgilerini Göster
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleConnectEtsy}
                  className="w-full md:w-auto"
                  disabled={connecting}
                >
                  {connecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Etsy'e Bağlanıyor...
                    </>
                  ) : (
                    <>
                      <Store className="mr-2 h-4 w-4" />
                      Etsy Mağazanıza Bağlanın
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </main>
        
        {/* Debug Bileşeni */}
        {showDebug && (
          <div className="mt-10 px-4 sm:px-6 lg:px-8 pb-10">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Etsy Bağlantı Bilgileri</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDebug(false)}
              >
                <XCircle className="h-4 w-4 mr-1" /> 
                Kapat
              </Button>
            </div>
            <Separator className="mb-4" />
            
            {debugInfo ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Kullanıcı Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(debugInfo.user, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Veritabanı Durumu</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(debugInfo.database, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Token Bilgileri</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(debugInfo.tokens, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Çevre Değişkenleri</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(debugInfo.environment, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Etsy bağlantı bilgileri yükleniyor...</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Mağazalar varsa mağaza listesini göster
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <Card key={store.shop_id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{store.shop_name}</CardTitle>
                    <CardDescription>{store.title || "Mağaza başlığı yok"}</CardDescription>
                  </div>
                  {store.is_vacation && (
                    <Badge variant="secondary">Tatil Modu</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>{store.listing_active_count} Ürün</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      <span>{store.num_favorers} Favori</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      <span>{store.review_average.toFixed(1)} Puan</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{store.review_count} Değerlendirme</span>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(store.url, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Mağazayı Görüntüle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}