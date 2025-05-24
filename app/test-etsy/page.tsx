"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertCircle, Store, Package, Eye, ExternalLink } from "lucide-react"

interface EtsyStore {
  shop_id: number
  shop_name: string
  title: string
  listing_active_count: number
  num_favorers: number
  url: string
}

interface EtsyListing {
  listing_id: number
  title: string
  price: {
    amount: number
    divisor: number
    currency_code: string
  }
  quantity: number
  state: string
  url: string
  images?: Array<{
    url_570xN: string
  }>
}

export default function TestEtsyPage() {
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [stores, setStores] = useState<EtsyStore[]>([])
  const [listings, setListings] = useState<EtsyListing[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const handleEtsyAuth = async () => {
    setAuthLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/etsy/auth")
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        setError("Auth URL oluşturulamadı")
      }
    } catch (err) {
      setError("Bağlantı hatası oluştu")
    } finally {
      setAuthLoading(false)
    }
  }

  const testConnection = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Test stores
      const storesResponse = await fetch("/api/etsy/test-stores")
      const storesData = await storesResponse.json()

      if (storesData.success) {
        setStores(storesData.stores)
        setIsConnected(true)
        setSuccess(`${storesData.stores.length} mağaza bulundu!`)

        // Test listings for first store
        if (storesData.stores.length > 0) {
          const listingsResponse = await fetch(`/api/etsy/test-listings?shopId=${storesData.stores[0].shop_id}`)
          const listingsData = await listingsResponse.json()

          if (listingsData.success) {
            setListings(listingsData.listings)
          }
        }
      } else {
        setError(storesData.error || "Mağaza bilgileri alınamadı")
      }
    } catch (err) {
      setError("Test sırasında hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const syncData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/etsy/sync", { method: "POST" })
      const data = await response.json()

      if (data.success) {
        setSuccess("Veriler başarıyla senkronize edildi!")
      } else {
        setError(data.error || "Senkronizasyon hatası")
      }
    } catch (err) {
      setError("Senkronizasyon sırasında hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">Etsy API Test Sayfası</h1>
          <p className="text-gray-600">Etsy bağlantınızı test edin ve veri çekme işlemlerini deneyin</p>
        </div>

        {/* Notifications */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Etsy API Test Kontrolleri</CardTitle>
            <CardDescription>Adım adım Etsy bağlantınızı test edin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button onClick={handleEtsyAuth} disabled={authLoading} variant="outline">
                {authLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Store className="w-4 h-4 mr-2" />}
                1. Etsy'ye Bağlan
              </Button>

              <Button onClick={testConnection} disabled={loading || !isConnected} variant="outline">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                2. Bağlantıyı Test Et
              </Button>

              <Button onClick={syncData} disabled={loading || !isConnected} variant="outline">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}
                3. Verileri Senkronize Et
              </Button>

              <Button asChild variant="outline">
                <a href="/dashboard">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  4. Dashboard'a Git
                </a>
              </Button>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p>• İlk önce Etsy hesabınızı bağlayın</p>
              <p>• Bağlantıyı test ederek mağaza bilgilerinizi görün</p>
              <p>• Verileri senkronize ederek database'e kaydedin</p>
              <p>• Dashboard'da sonuçları kontrol edin</p>
            </div>
          </CardContent>
        </Card>

        {/* Stores */}
        {stores.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Etsy Mağazalarınız ({stores.length})</CardTitle>
              <CardDescription>Bağlı Etsy mağazalarınızın listesi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.map((store) => (
                  <Card key={store.shop_id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">{store.shop_name}</h3>
                        <p className="text-sm text-gray-600">{store.title}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span>Aktif Ürün: {store.listing_active_count}</span>
                          <span>Takipçi: {store.num_favorers}</span>
                        </div>
                        <Badge variant="default" className="w-fit">
                          ID: {store.shop_id}
                        </Badge>
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <a href={store.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Etsy'de Görüntüle
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Listings */}
        {listings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ürünleriniz ({listings.length})</CardTitle>
              <CardDescription>İlk mağazanızdan çekilen ürün örnekleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.slice(0, 6).map((listing) => (
                  <Card key={listing.listing_id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {listing.images && listing.images[0] && (
                          <img
                            src={listing.images[0].url_570xN || "/placeholder.svg"}
                            alt={listing.title}
                            className="w-full h-32 object-cover rounded"
                          />
                        )}
                        <div>
                          <h4 className="font-medium text-sm line-clamp-2">{listing.title}</h4>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-semibold text-green-600">
                              {listing.price.currency_code} {(listing.price.amount / listing.price.divisor).toFixed(2)}
                            </span>
                            <Badge variant={listing.state === "active" ? "default" : "secondary"}>
                              {listing.state}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Stok: {listing.quantity}</p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <a href={listing.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Etsy'de Görüntüle
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Info */}
        <Card>
          <CardHeader>
            <CardTitle>API Bilgileri</CardTitle>
            <CardDescription>Etsy API konfigürasyon durumu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium">Client ID</p>
                <p className="text-gray-600">vqxojc8ud4eyk1ovhj3u7vzn</p>
              </div>
              <div>
                <p className="font-medium">Rate Limit</p>
                <p className="text-gray-600">5/sec, 5,000/day</p>
              </div>
              <div>
                <p className="font-medium">OAuth</p>
                <p className="text-gray-600">Personal Access</p>
              </div>
              <div>
                <p className="font-medium">Status</p>
                <Badge variant={isConnected ? "default" : "outline"}>{isConnected ? "Bağlı" : "Bağlı Değil"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md flex items-center justify-center mr-2">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
              AI Önerileri
            </CardTitle>
            <CardDescription>Yapay zeka destekli öneriler</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Yakında gelecek...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
