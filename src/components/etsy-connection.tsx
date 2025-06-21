"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, ExternalLink, RefreshCw, Store, CheckCircle, AlertCircle } from "lucide-react"

interface EtsyConnectionProps {
  isConnected: boolean
  shopName?: string
  onConnect: () => void
  onSync: () => void
  loading?: boolean
  error?: string
}

export default function EtsyConnection({
  isConnected,
  shopName,
  onConnect,
  onSync,
  loading = false,
  error,
}: EtsyConnectionProps) {
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      await onSync()
    } finally {
      setSyncing(false)
    }
  }

  if (isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Store className="w-5 h-5 mr-2" />
            Etsy Bağlantısı
            <Badge variant="default" className="ml-2">
              <CheckCircle className="w-3 h-3 mr-1" />
              Bağlı
            </Badge>
          </CardTitle>
          <CardDescription>
            {shopName ? `${shopName} mağazanız başarıyla bağlandı` : "Etsy mağazanız bağlı"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center space-x-2">
            <Button onClick={handleSync} disabled={syncing} variant="outline">
              {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Verileri Senkronize Et
            </Button>

            <Button variant="outline" asChild>
              <a href="https://www.etsy.com/your/shops/me" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Etsy'de Görüntüle
              </a>
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            <p>• Ürünleriniz otomatik olarak senkronize edilir</p>
            <p>• Stok ve fiyat bilgileri güncel tutulur</p>
            <p>• Sipariş bilgileri takip edilir</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Store className="w-5 h-5 mr-2" />
          Etsy Mağazanızı Bağlayın
          <Badge variant="outline" className="ml-2">
            <AlertCircle className="w-3 h-3 mr-1" />
            Bağlı Değil
          </Badge>
        </CardTitle>
        <CardDescription>Etsy mağazanızı bağlayarak ürünlerinizi ve siparişlerinizi tek yerden yönetin</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">Bağlandığınızda şunları yapabilirsiniz:</p>
            <ul className="space-y-1">
              <li>• Tüm ürünlerinizi tek yerden görüntüleme</li>
              <li>• Stok ve fiyat takibi</li>
              <li>• Sipariş yönetimi</li>
              <li>• Satış analitikleri</li>
              <li>• AI destekli öneriler</li>
            </ul>
          </div>

          <Button onClick={onConnect} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Store className="w-4 h-4 mr-2" />}
            Etsy Hesabımı Bağla
          </Button>

          <p className="text-xs text-gray-500 text-center">Güvenli OAuth 2.0 ile bağlanır. Şifrenizi paylaşmayız.</p>
        </div>
      </CardContent>
    </Card>
  )
}
