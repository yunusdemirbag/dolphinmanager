"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Megaphone,
  Target,
  DollarSign,
  TrendingUp,
  MousePointerClickIcon as Click,
  Calendar,
  Gift,
  Share2,
  BarChart3,
  Zap,
} from "lucide-react"

export default function MarketingPage() {
  const [campaignName, setCampaignName] = useState("")
  const [campaignBudget, setCampaignBudget] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [etsyAdsData, setEtsyAdsData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMarketingData()
  }, [])

  const loadMarketingData = async () => {
    try {
      // Gerçek marketing verilerini API'den çek
      const response = await fetch('/api/etsy/marketing')
      
      if (response.ok) {
        const data = await response.json()
        setEtsyAdsData(data)
      } else {
        // API hatası - boş veri göster
        setEtsyAdsData(null)
      }
    } catch (error) {
      console.error("Marketing API error:", error)
      // Hata durumunda boş veri göster
      setEtsyAdsData(null)
    } finally {
      setLoading(false)
    }
  }

  // Demo veriler kaldırıldı - gerçek veriler API'den gelecek
  const campaigns: any[] = []
  const coupons: any[] = []
  const socialMediaStats = {
    instagram_followers: 0,
    instagram_engagement: 0,
    pinterest_followers: 0,
    pinterest_monthly_views: 0,
    facebook_followers: 0,
    facebook_reach: 0,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "paused":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "ended":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Aktif"
      case "paused":
        return "Duraklatıldı"
      case "ended":
        return "Sona Erdi"
      default:
        return "Bilinmiyor"
    }
  }

  const getCouponTypeText = (type: string) => {
    switch (type) {
      case "percentage":
        return "Yüzde İndirim"
      case "fixed":
        return "Sabit İndirim"
      case "free_shipping":
        return "Ücretsiz Kargo"
      default:
        return "Diğer"
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col space-y-8">
        {/* Campaign Creation */}
        <Card>
          <CardHeader>
            <CardTitle>Yeni Kampanya Oluştur</CardTitle>
            <CardDescription>Etsy mağazanız için yeni bir pazarlama kampanyası başlatın</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm font-medium">Kampanya Adı</label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Kampanya adını girin"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Günlük Bütçe (₺)</label>
              <Input
                value={campaignBudget}
                onChange={(e) => setCampaignBudget(e.target.value)}
                placeholder="0.00"
                type="number"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Hedef Kitle</label>
              <select className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Hedef kitle seçin</option>
                <option value="jewelry_lovers">Mücevher Severler</option>
                <option value="home_decor">Ev Dekorasyonu</option>
                <option value="vintage_collectors">Vintage Koleksiyoncuları</option>
                <option value="handmade_enthusiasts">El Yapımı Ürün Severler</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Kampanya Türü</label>
              <select className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="search">Arama Reklamları</option>
                <option value="browse">Kategori Reklamları</option>
                <option value="offsite">Offsite Ads</option>
              </select>
            </div>

            <Button className="w-full bg-orange-600 hover:bg-orange-700">
              <Zap className="w-4 h-4 mr-2" />
              Kampanyayı Başlat
            </Button>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">💡 Kampanya İpuçları</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Günlük bütçenizi küçük başlatın</li>
                <li>• Yüksek kaliteli fotoğraflar kullanın</li>
                <li>• Anahtar kelimeleri optimize edin</li>
                <li>• Performansı düzenli takip edin</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Active Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Aktif Kampanyalar</CardTitle>
            <CardDescription>Şu anda yürütülen kampanyalarınız</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{campaign.name}</h4>
                      <p className="text-sm text-gray-600">{campaign.type}</p>
                    </div>
                    <Badge className={getStatusColor(campaign.status)}>{getStatusText(campaign.status)}</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Harcanan</p>
                      <p className="font-semibold">₺{campaign.spent}</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Tıklama</p>
                      <p className="font-semibold">{campaign.clicks}</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Dönüşüm</p>
                      <p className="font-semibold">{campaign.conversions}</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Gelir</p>
                      <p className="font-semibold text-green-600">₺{campaign.revenue}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Bütçe Kullanımı:</span>
                      <span>{Math.round((campaign.spent / campaign.budget) * 100)}%</span>
                    </div>
                    <Progress value={(campaign.spent / campaign.budget) * 100} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="text-sm text-gray-600">
                      ROAS: {(campaign.revenue / campaign.spent).toFixed(1)}x
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        Düzenle
                      </Button>
                      <Button size="sm" variant="outline">
                        {campaign.status === "active" ? "Duraklat" : "Başlat"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Kampanya Analizleri</CardTitle>
            <CardDescription>Kampanyalarınızın performans metrikleri</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-900">Etsy Ads ROI</h4>
                    <p className="text-sm text-green-700">Son 30 gün</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{etsyAdsData?.return_on_ad_spend}x</p>
                    <p className="text-sm text-green-600">ROAS</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">Kupon Kullanımı</h4>
                    <p className="text-sm text-blue-700">Aktif kuponlar</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {coupons.reduce((sum, c) => sum + c.usage_count, 0)}
                    </p>
                    <p className="text-sm text-blue-600">Toplam kullanım</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-purple-900">Sosyal Medya Erişimi</h4>
                    <p className="text-sm text-purple-700">Tüm platformlar</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">
                      {(
                        (socialMediaStats.pinterest_monthly_views + socialMediaStats.facebook_reach) /
                        1000
                      ).toFixed(0)}
                      k
                    </p>
                    <p className="text-sm text-purple-600">Aylık erişim</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
