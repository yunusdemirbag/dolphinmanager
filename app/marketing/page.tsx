"use client"

import { useState } from "react"
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

  // Mock marketing data
  const etsyAdsData = {
    active_campaigns: 3,
    total_spend: 245,
    total_clicks: 1250,
    total_impressions: 15600,
    conversion_rate: 2.4,
    cost_per_click: 0.196,
    return_on_ad_spend: 4.2,
  }

  const campaigns = [
    {
      id: "1",
      name: "Holiday Jewelry Collection",
      type: "Etsy Ads",
      status: "active",
      budget: 50,
      spent: 32.45,
      clicks: 165,
      impressions: 2100,
      conversions: 8,
      revenue: 456,
      start_date: "2024-01-15",
      end_date: "2024-02-15",
    },
    {
      id: "2",
      name: "Ceramic Mug Promotion",
      type: "Etsy Ads",
      status: "active",
      budget: 30,
      spent: 28.9,
      clicks: 89,
      impressions: 1200,
      conversions: 3,
      revenue: 168,
      start_date: "2024-01-20",
      end_date: "2024-02-20",
    },
    {
      id: "3",
      name: "Vintage Collection Boost",
      type: "Etsy Ads",
      status: "paused",
      budget: 75,
      spent: 45.2,
      clicks: 234,
      impressions: 3200,
      conversions: 12,
      revenue: 890,
      start_date: "2024-01-10",
      end_date: "2024-02-10",
    },
  ]

  const coupons = [
    {
      id: "1",
      code: "WELCOME20",
      type: "percentage",
      value: 20,
      min_order: 50,
      usage_count: 45,
      usage_limit: 100,
      start_date: "2024-01-01",
      end_date: "2024-03-31",
      status: "active",
    },
    {
      id: "2",
      code: "FREESHIP",
      type: "free_shipping",
      value: 0,
      min_order: 75,
      usage_count: 23,
      usage_limit: 50,
      start_date: "2024-01-15",
      end_date: "2024-02-15",
      status: "active",
    },
    {
      id: "3",
      code: "SAVE15",
      type: "fixed",
      value: 15,
      min_order: 100,
      usage_count: 12,
      usage_limit: 25,
      start_date: "2024-01-20",
      end_date: "2024-02-20",
      status: "active",
    },
  ]

  const socialMediaStats = {
    instagram_followers: 2450,
    instagram_engagement: 4.2,
    pinterest_followers: 1890,
    pinterest_monthly_views: 15600,
    facebook_followers: 890,
    facebook_reach: 5600,
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/dolphin-logo.svg" alt="Dolphin Manager" className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Marketing Merkezi</h1>
                <p className="text-sm text-gray-600">Etsy Ads, kuponlar ve sosyal medya yönetimi</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Raporlar
              </Button>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Megaphone className="w-4 h-4 mr-2" />
                Yeni Kampanya
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Reklam Harcaması</p>
                  <p className="text-2xl font-bold text-gray-900">₺{etsyAdsData.total_spend}</p>
                  <p className="text-sm text-orange-600">Bu ay</p>
                </div>
                <div className="p-3 rounded-full bg-orange-50">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ROAS</p>
                  <p className="text-2xl font-bold text-gray-900">{etsyAdsData.return_on_ad_spend}x</p>
                  <p className="text-sm text-blue-600">Return on Ad Spend</p>
                </div>
                <div className="p-3 rounded-full bg-blue-50">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Tıklama</p>
                  <p className="text-2xl font-bold text-gray-900">{etsyAdsData.total_clicks.toLocaleString()}</p>
                  <p className="text-sm text-green-600">
                    CTR: %{((etsyAdsData.total_clicks / etsyAdsData.total_impressions) * 100).toFixed(1)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-50">
                  <Click className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Dönüşüm Oranı</p>
                  <p className="text-2xl font-bold text-gray-900">%{etsyAdsData.conversion_rate}</p>
                  <p className="text-sm text-purple-600">Ortalama</p>
                </div>
                <div className="p-3 rounded-full bg-purple-50">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="ads" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ads">Etsy Ads</TabsTrigger>
            <TabsTrigger value="coupons">Kuponlar</TabsTrigger>
            <TabsTrigger value="social">Sosyal Medya</TabsTrigger>
            <TabsTrigger value="analytics">Analitikler</TabsTrigger>
          </TabsList>

          <TabsContent value="ads">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Megaphone className="w-5 h-5 mr-2 text-orange-600" />
                      Aktif Kampanyalar
                    </CardTitle>
                    <CardDescription>Etsy Ads kampanyalarınızın performansı</CardDescription>
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
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Yeni Kampanya Oluştur</CardTitle>
                    <CardDescription>Etsy Ads kampanyanızı başlatın</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
              </div>
            </div>
          </TabsContent>

          <TabsContent value="coupons">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Gift className="w-5 h-5 mr-2 text-green-600" />
                      Aktif Kuponlar
                    </CardTitle>
                    <CardDescription>Müşterileriniz için oluşturduğunuz indirim kuponları</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {coupons.map((coupon) => (
                        <div key={coupon.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-semibold text-lg">{coupon.code}</h4>
                                <Badge variant="secondary">{getCouponTypeText(coupon.type)}</Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {coupon.type === "percentage" && `%${coupon.value} indirim`}
                                {coupon.type === "fixed" && `₺${coupon.value} indirim`}
                                {coupon.type === "free_shipping" && "Ücretsiz kargo"}
                                {coupon.min_order > 0 && ` (Min. ₺${coupon.min_order})`}
                              </p>
                            </div>
                            <Badge className={getStatusColor(coupon.status)}>{getStatusText(coupon.status)}</Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-sm text-gray-600">Kullanım</p>
                              <p className="font-semibold">
                                {coupon.usage_count}/{coupon.usage_limit}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-sm text-gray-600">Başlangıç</p>
                              <p className="font-semibold">{new Date(coupon.start_date).toLocaleDateString("tr-TR")}</p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-sm text-gray-600">Bitiş</p>
                              <p className="font-semibold">{new Date(coupon.end_date).toLocaleDateString("tr-TR")}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Kullanım Oranı:</span>
                              <span>{Math.round((coupon.usage_count / coupon.usage_limit) * 100)}%</span>
                            </div>
                            <Progress value={(coupon.usage_count / coupon.usage_limit) * 100} className="h-2" />
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <div className="text-sm text-gray-600">
                              Kalan süre:{" "}
                              {Math.ceil(
                                (new Date(coupon.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                              )}{" "}
                              gün
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                Düzenle
                              </Button>
                              <Button size="sm" variant="outline">
                                Paylaş
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Yeni Kupon Oluştur</CardTitle>
                    <CardDescription>Müşterileriniz için indirim kuponu oluşturun</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Kupon Kodu</label>
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="KUPONKODU"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">İndirim Türü</label>
                      <select className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm">
                        <option value="percentage">Yüzde İndirim</option>
                        <option value="fixed">Sabit Tutar İndirim</option>
                        <option value="free_shipping">Ücretsiz Kargo</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">İndirim Miktarı</label>
                      <Input placeholder="20" type="number" className="mt-1" />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Minimum Sipariş Tutarı (₺)</label>
                      <Input placeholder="50" type="number" className="mt-1" />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Kullanım Limiti</label>
                      <Input placeholder="100" type="number" className="mt-1" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-medium">Başlangıç</label>
                        <Input type="date" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Bitiş</label>
                        <Input type="date" className="mt-1" />
                      </div>
                    </div>

                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      <Gift className="w-4 h-4 mr-2" />
                      Kupon Oluştur
                    </Button>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">🎯 Kupon Stratejileri</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• İlk alışveriş için %20 indirim</li>
                        <li>• ₺100 üzeri ücretsiz kargo</li>
                        <li>• Sadık müşteriler için özel indirim</li>
                        <li>• Sezonsal kampanyalar</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="social">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Share2 className="w-5 h-5 mr-2 text-pink-600" />
                    Sosyal Medya İstatistikleri
                  </CardTitle>
                  <CardDescription>Sosyal medya hesaplarınızın performansı</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">IG</span>
                        </div>
                        <div>
                          <h4 className="font-medium">Instagram</h4>
                          <p className="text-sm text-gray-600">
                            {socialMediaStats.instagram_followers.toLocaleString()} takipçi
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-pink-600">%{socialMediaStats.instagram_engagement}</p>
                        <p className="text-xs text-gray-600">Etkileşim oranı</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">P</span>
                        </div>
                        <div>
                          <h4 className="font-medium">Pinterest</h4>
                          <p className="text-sm text-gray-600">
                            {socialMediaStats.pinterest_followers.toLocaleString()} takipçi
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">
                          {(socialMediaStats.pinterest_monthly_views / 1000).toFixed(1)}k
                        </p>
                        <p className="text-xs text-gray-600">Aylık görüntülenme</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">f</span>
                        </div>
                        <div>
                          <h4 className="font-medium">Facebook</h4>
                          <p className="text-sm text-gray-600">
                            {socialMediaStats.facebook_followers.toLocaleString()} takipçi
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-600">
                          {(socialMediaStats.facebook_reach / 1000).toFixed(1)}k
                        </p>
                        <p className="text-xs text-gray-600">Haftalık erişim</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>İçerik Planlayıcı</CardTitle>
                  <CardDescription>Sosyal medya içeriklerinizi planlayın</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">İçerik Türü</label>
                    <select className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm">
                      <option value="product_showcase">Ürün Tanıtımı</option>
                      <option value="behind_scenes">Sahne Arkası</option>
                      <option value="customer_feature">Müşteri Hikayesi</option>
                      <option value="process_video">Üretim Süreci</option>
                      <option value="styling_tips">Stil Önerileri</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Açıklama</label>
                    <Textarea placeholder="İçerik açıklamanızı yazın..." rows={3} className="mt-1" />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Yayın Tarihi</label>
                    <Input type="datetime-local" className="mt-1" />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Platformlar</label>
                    <div className="flex space-x-4 mt-2">
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        Instagram
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        Pinterest
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        Facebook
                      </label>
                    </div>
                  </div>

                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    <Calendar className="w-4 h-4 mr-2" />
                    İçeriği Planla
                  </Button>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">📱 İçerik İpuçları</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Yüksek kaliteli fotoğraflar kullanın</li>
                      <li>• Hikaye anlatımına odaklanın</li>
                      <li>• Hashtag'leri stratejik kullanın</li>
                      <li>• Düzenli paylaşım yapın</li>
                      <li>• Takipçilerinizle etkileşime geçin</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Marketing ROI</CardTitle>
                  <CardDescription>Marketing yatırımlarınızın geri dönüşü</CardDescription>
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
                          <p className="text-2xl font-bold text-green-600">{etsyAdsData.return_on_ad_spend}x</p>
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

              <Card>
                <CardHeader>
                  <CardTitle>Performans Önerileri</CardTitle>
                  <CardDescription>AI destekli marketing önerileri</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-start space-x-3">
                        <Zap className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-900">Etsy Ads Optimizasyonu</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            "Holiday Jewelry Collection" kampanyanızın ROAS'ı yüksek. Bütçeyi %20 artırmayı düşünün.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start space-x-3">
                        <Gift className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-900">Kupon Stratejisi</h4>
                          <p className="text-sm text-green-700 mt-1">
                            WELCOME20 kuponunuz popüler. Benzer bir kupon oluşturarak yeni müşteri kazanabilirsiniz.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start space-x-3">
                        <Share2 className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900">Sosyal Medya</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Pinterest'te görüntülenme oranınız yüksek. Daha fazla ürün pini oluşturmayı düşünün.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-start space-x-3">
                        <Target className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-purple-900">Hedef Kitle</h4>
                          <p className="text-sm text-purple-700 mt-1">
                            25-35 yaş arası kadın müşterilerinizin dönüşüm oranı yüksek. Bu segmente odaklanın.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
