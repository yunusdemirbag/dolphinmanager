"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Settings,
  Store,
  Truck,
  Package,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Link,
  Unlink,
  Globe,
  CreditCard,
  Shield,
  Bell,
  User,
  Mail,
  Phone,
  MapPin,
  Clock
} from "lucide-react"
import { createClientSupabase } from "@/lib/supabase"
import CurrentStoreNameBadge from "../components/CurrentStoreNameBadge"
import { prompts, updatePrompt, resetPrompt, PromptConfig } from "@/lib/prompts"

interface ShopSettings {
  shop_id: number
  shop_name: string
  title: string
  announcement: string
  sale_message: string
  digital_sale_message: string
  currency_code: string
  is_vacation: boolean
  url: string
}

interface ShippingProfile {
  shipping_profile_id: number
  title: string
  user_id: number
  min_processing_time: number
  max_processing_time: number
  processing_time_unit: string
  origin_country_iso: string
}

interface ShopSection {
  shop_section_id: number
  title: string
  rank: number
  user_id: number
  active_listing_count: number
}

interface CreateShippingForm {
  title: string
  origin_country_iso: string
  primary_cost: number
  secondary_cost: number
  min_processing_time: number
  max_processing_time: number
  destination_region: "eu" | "non_eu" | "none"
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [etsyConnected, setEtsyConnected] = useState(false)
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null)
  const [shippingProfiles, setShippingProfiles] = useState<ShippingProfile[]>([])
  const [shopSections, setShopSections] = useState<ShopSection[]>([])
  const [showShippingModal, setShowShippingModal] = useState(false)
  const [showSectionModal, setShowSectionModal] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState("")
  const [promptsState, setPromptsState] = useState<PromptConfig[]>([])
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [shippingForm, setShippingForm] = useState<CreateShippingForm>({
    title: "",
    origin_country_iso: "TR",
    primary_cost: 0,
    secondary_cost: 0,
    min_processing_time: 1,
    max_processing_time: 3,
    destination_region: "none"
  })

  useEffect(() => {
    loadSettings()
    setPromptsState([...prompts])
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      // Etsy bağlantı durumunu kontrol et
      const storesResponse = await fetch('/api/etsy/stores')
      if (storesResponse.ok) {
        const storesData = await storesResponse.json()
        if (storesData.stores && storesData.stores.length > 0) {
          setEtsyConnected(true)
          const shop = storesData.stores[0]
          setShopSettings({
            shop_id: shop.shop_id,
            shop_name: shop.shop_name,
            title: shop.title || shop.shop_name,
            announcement: shop.announcement || "",
            sale_message: "",
            digital_sale_message: "",
            currency_code: shop.currency_code,
            is_vacation: shop.is_vacation,
            url: shop.url
          })
          
          // Shipping profiles ve sections'ı yükle
          await Promise.all([
            loadShippingProfiles(),
            loadShopSections()
          ])
        } else {
          setEtsyConnected(false)
        }
      } else {
        setEtsyConnected(false)
      }
    } catch (error) {
      console.error("Settings load error:", error)
      setEtsyConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const loadShippingProfiles = async () => {
    try {
      // Bu endpoint henüz yok, şimdilik boş array
      setShippingProfiles([])
    } catch (error) {
      console.error("Shipping profiles load error:", error)
    }
  }

  const loadShopSections = async () => {
    try {
      // Bu endpoint henüz yok, şimdilik boş array
      setShopSections([])
    } catch (error) {
      console.error("Shop sections load error:", error)
    }
  }

  const handleSaveShopSettings = async () => {
    if (!shopSettings) return

    setSaving(true)
    try {
      const response = await fetch('/api/etsy/shop/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: shopSettings.title,
          announcement: shopSettings.announcement,
          sale_message: shopSettings.sale_message,
          digital_sale_message: shopSettings.digital_sale_message
        })
      })

      if (response.ok) {
        alert("✅ Mağaza ayarları başarıyla güncellendi!")
      } else {
        const errorData = await response.json()
        alert(`❌ Hata: ${errorData.details || errorData.error}`)
      }
    } catch (error) {
      console.error("Save shop settings error:", error)
      alert("❌ Ayarlar kaydedilirken hata oluştu!")
    } finally {
      setSaving(false)
    }
  }

  const handleCreateShippingProfile = async () => {
    if (!shippingForm.title) {
      alert("Lütfen profil başlığını girin!")
      return
    }

    setSaving(true)
    try {
      // Bu endpoint henüz yok
      alert("🚧 Shipping profilleri özelliği yakında eklenecek!")
      setShowShippingModal(false)
    } catch (error) {
      console.error("Create shipping profile error:", error)
      alert("❌ Shipping profili oluşturulurken hata oluştu!")
    } finally {
      setSaving(false)
    }
  }

  const handleCreateSection = async () => {
    if (!newSectionTitle.trim()) {
      alert("Lütfen bölüm başlığını girin!")
      return
    }

    setSaving(true)
    try {
      // Bu endpoint henüz yok
      alert("🚧 Shop sections özelliği yakında eklenecek!")
      setShowSectionModal(false)
      setNewSectionTitle("")
    } catch (error) {
      console.error("Create section error:", error)
      alert("❌ Bölüm oluşturulurken hata oluştu!")
    } finally {
      setSaving(false)
    }
  }

  const handleEtsyReconnect = async () => {
    try {
      const response = await fetch('/api/etsy/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const { authUrl } = await response.json()
        window.location.href = authUrl
      } else {
        const errorData = await response.json()
        alert(`Etsy bağlantısı başlatılamadı: ${errorData.details || errorData.error}`)
      }
    } catch (error) {
      console.error('Error connecting to Etsy:', error)
      alert('Bağlantı hatası: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleSavePrompt = (id: string, newPrompt: string) => {
    setSaving(true)
    try {
      updatePrompt(id, newPrompt)
      setPromptsState([...prompts])
      alert("✅ Prompt başarıyla güncellendi!")
    } catch (error) {
      console.error("Save prompt error:", error)
      alert("❌ Prompt kaydedilirken hata oluştu!")
    } finally {
      setSaving(false)
      setEditingPromptId(null)
    }
  }

  const handleResetPrompt = (id: string) => {
    setSaving(true)
    try {
      resetPrompt(id)
      setPromptsState([...prompts])
      alert("✅ Prompt varsayılan değerine sıfırlandı!")
    } catch (error) {
      console.error("Reset prompt error:", error)
      alert("❌ Prompt sıfırlanırken hata oluştu!")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 animate-pulse text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Ayarlar yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-2xl font-bold">Ayarlar</h1>
          <div className="flex items-center gap-2 mt-2">
            <CurrentStoreNameBadge />
          </div>
          <div className="text-gray-500 text-base mt-2 mb-2">Mağaza Ayarlarınızı Ve Tercihlerinizi Yönetin.</div>
        </div>

        <Tabs defaultValue="shop" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="shop">Mağaza</TabsTrigger>
            <TabsTrigger value="shipping">Kargo</TabsTrigger>
            <TabsTrigger value="sections">Bölümler</TabsTrigger>
            <TabsTrigger value="prompts">Promptlar</TabsTrigger>
            <TabsTrigger value="account">Hesap</TabsTrigger>
          </TabsList>

          {/* Shop Settings */}
          <TabsContent value="shop" className="space-y-6">
            {!etsyConnected ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
                    Etsy Bağlantısı Gerekli
                  </CardTitle>
                  <CardDescription>
                    Mağaza ayarlarını yönetmek için önce Etsy hesabınızı bağlamanız gerekiyor.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleEtsyReconnect} className="bg-orange-600 hover:bg-orange-700">
                    <Link className="h-4 w-4 mr-2" />
                    Etsy'ye Bağlan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Shop Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Store className="h-5 w-5 text-blue-600 mr-2" />
                      Mağaza Bilgileri
                    </CardTitle>
                    <CardDescription>
                      Etsy mağazanızın temel bilgilerini güncelleyin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {shopSettings && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="shop_name">Mağaza Adı</Label>
                            <Input
                              id="shop_name"
                              value={shopSettings.shop_name}
                              disabled
                              className="bg-gray-50"
                            />
                            <p className="text-xs text-gray-500 mt-1">Mağaza adı Etsy'de değiştirilemez</p>
                          </div>
                          <div>
                            <Label htmlFor="currency">Para Birimi</Label>
                            <Input
                              id="currency"
                              value={shopSettings.currency_code}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="title">Mağaza Başlığı</Label>
                          <Input
                            id="title"
                            value={shopSettings.title}
                            onChange={(e) => setShopSettings(prev => prev ? { ...prev, title: e.target.value } : null)}
                            placeholder="Mağazanızın başlığı"
                            maxLength={55}
                          />
                          <p className="text-xs text-gray-500 mt-1">{shopSettings.title.length}/55 karakter</p>
                        </div>

                        <div>
                          <Label htmlFor="announcement">Mağaza Duyurusu</Label>
                          <Textarea
                            id="announcement"
                            value={shopSettings.announcement}
                            onChange={(e) => setShopSettings(prev => prev ? { ...prev, announcement: e.target.value } : null)}
                            placeholder="Mağaza ana sayfasında gösterilecek duyuru"
                            rows={3}
                            maxLength={160}
                          />
                          <p className="text-xs text-gray-500 mt-1">{shopSettings.announcement.length}/160 karakter</p>
                        </div>

                        <div>
                          <Label htmlFor="sale_message">Satış Mesajı</Label>
                          <Textarea
                            id="sale_message"
                            value={shopSettings.sale_message}
                            onChange={(e) => setShopSettings(prev => prev ? { ...prev, sale_message: e.target.value } : null)}
                            placeholder="Müşterilere satış sonrası gönderilecek mesaj"
                            rows={3}
                            maxLength={500}
                          />
                          <p className="text-xs text-gray-500 mt-1">{shopSettings.sale_message.length}/500 karakter</p>
                        </div>

                        <div>
                          <Label htmlFor="digital_sale_message">Dijital Ürün Satış Mesajı</Label>
                          <Textarea
                            id="digital_sale_message"
                            value={shopSettings.digital_sale_message}
                            onChange={(e) => setShopSettings(prev => prev ? { ...prev, digital_sale_message: e.target.value } : null)}
                            placeholder="Dijital ürün satışları için özel mesaj"
                            rows={3}
                            maxLength={500}
                          />
                          <p className="text-xs text-gray-500 mt-1">{shopSettings.digital_sale_message.length}/500 karakter</p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              Mağaza URL: <a href={shopSettings.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{shopSettings.url}</a>
                            </span>
                          </div>
                          <Button onClick={handleSaveShopSettings} disabled={saving}>
                            {saving ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            {saving ? "Kaydediliyor..." : "Kaydet"}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Vacation Mode */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 text-purple-600 mr-2" />
                      Tatil Modu
                    </CardTitle>
                    <CardDescription>
                      Mağazanızı geçici olarak kapatın
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {shopSettings?.is_vacation ? "Tatil modu aktif" : "Tatil modu pasif"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {shopSettings?.is_vacation 
                            ? "Mağazanız şu anda kapalı ve yeni siparişler alınmıyor"
                            : "Mağazanız açık ve siparişler alınıyor"
                          }
                        </p>
                      </div>
                      <Badge variant={shopSettings?.is_vacation ? "destructive" : "default"}>
                        {shopSettings?.is_vacation ? "Kapalı" : "Açık"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Shipping Settings */}
          <TabsContent value="shipping" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Truck className="h-5 w-5 text-green-600 mr-2" />
                    Kargo Profilleri
                  </div>
                  <Dialog open={showShippingModal} onOpenChange={setShowShippingModal}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Profil
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Yeni Kargo Profili</DialogTitle>
                        <DialogDescription>
                          Farklı bölgeler için kargo ayarları oluşturun
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="shipping-title">Profil Adı</Label>
                          <Input
                            id="shipping-title"
                            value={shippingForm.title}
                            onChange={(e) => setShippingForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Örn: Türkiye İçi Kargo"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="primary-cost">Ana Kargo Ücreti (USD)</Label>
                            <Input
                              id="primary-cost"
                              type="number"
                              step="0.01"
                              value={shippingForm.primary_cost}
                              onChange={(e) => setShippingForm(prev => ({ ...prev, primary_cost: parseFloat(e.target.value) || 0 }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="secondary-cost">Ek Ürün Ücreti (USD)</Label>
                            <Input
                              id="secondary-cost"
                              type="number"
                              step="0.01"
                              value={shippingForm.secondary_cost}
                              onChange={(e) => setShippingForm(prev => ({ ...prev, secondary_cost: parseFloat(e.target.value) || 0 }))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="min-processing">Min İşlem Süresi (gün)</Label>
                            <Input
                              id="min-processing"
                              type="number"
                              min="1"
                              value={shippingForm.min_processing_time}
                              onChange={(e) => setShippingForm(prev => ({ ...prev, min_processing_time: parseInt(e.target.value) || 1 }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="max-processing">Max İşlem Süresi (gün)</Label>
                            <Input
                              id="max-processing"
                              type="number"
                              min="1"
                              value={shippingForm.max_processing_time}
                              onChange={(e) => setShippingForm(prev => ({ ...prev, max_processing_time: parseInt(e.target.value) || 1 }))}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="destination">Hedef Bölge</Label>
                          <Select value={shippingForm.destination_region} onValueChange={(value: any) => setShippingForm(prev => ({ ...prev, destination_region: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Belirtilmemiş</SelectItem>
                              <SelectItem value="eu">Avrupa Birliği</SelectItem>
                              <SelectItem value="non_eu">AB Dışı</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowShippingModal(false)}>
                          İptal
                        </Button>
                        <Button onClick={handleCreateShippingProfile} disabled={saving}>
                          {saving ? "Oluşturuluyor..." : "Oluştur"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
                <CardDescription>
                  Farklı bölgeler için kargo ayarlarınızı yönetin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {shippingProfiles.length === 0 ? (
                  <div className="text-center py-8">
                    <Truck className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Kargo profili bulunamadı</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      İlk kargo profilinizi oluşturun
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shippingProfiles.map((profile) => (
                      <div key={profile.shipping_profile_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{profile.title}</h4>
                          <p className="text-sm text-gray-600">
                            İşlem süresi: {profile.min_processing_time}-{profile.max_processing_time} {profile.processing_time_unit}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shop Sections */}
          <TabsContent value="sections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-purple-600 mr-2" />
                    Mağaza Bölümleri
                  </div>
                  <Dialog open={showSectionModal} onOpenChange={setShowSectionModal}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Bölüm
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Yeni Mağaza Bölümü</DialogTitle>
                        <DialogDescription>
                          Ürünlerinizi organize etmek için bölüm oluşturun
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="section-title">Bölüm Adı</Label>
                          <Input
                            id="section-title"
                            value={newSectionTitle}
                            onChange={(e) => setNewSectionTitle(e.target.value)}
                            placeholder="Örn: Canvas Tablolar"
                            maxLength={24}
                          />
                          <p className="text-xs text-gray-500 mt-1">{newSectionTitle.length}/24 karakter</p>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSectionModal(false)}>
                          İptal
                        </Button>
                        <Button onClick={handleCreateSection} disabled={saving}>
                          {saving ? "Oluşturuluyor..." : "Oluştur"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
                <CardDescription>
                  Mağazanızdaki ürün kategorilerini düzenleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {shopSections.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Bölüm bulunamadı</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      İlk mağaza bölümünüzü oluşturun
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shopSections.map((section) => (
                      <div key={section.shop_section_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{section.title}</h4>
                          <p className="text-sm text-gray-600">
                            {section.active_listing_count} aktif ürün
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prompts Settings */}
          <TabsContent value="prompts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 text-blue-600 mr-2" />
                  AI Promptları
                </CardTitle>
                <CardDescription>
                  OpenAI API için kullanılan promptları düzenleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {promptsState.map((prompt) => (
                  <div key={prompt.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-lg">{prompt.name}</h3>
                        <p className="text-sm text-gray-600">{prompt.description}</p>
                        {prompt.description.includes('${title}') && (
                          <p className="text-xs text-blue-600 mt-1">Not: Bu prompt ürün başlığını kullanır</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingPromptId(editingPromptId === prompt.id ? null : prompt.id)}
                        >
                          {editingPromptId === prompt.id ? "İptal" : "Düzenle"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-orange-600"
                          onClick={() => handleResetPrompt(prompt.id)}
                        >
                          Sıfırla
                        </Button>
                      </div>
                    </div>
                    
                    {editingPromptId === prompt.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={prompt.prompt}
                          onChange={(e) => {
                            const updatedPrompts = promptsState.map(p => 
                              p.id === prompt.id ? { ...p, prompt: e.target.value } : p
                            )
                            setPromptsState(updatedPrompts)
                          }}
                          rows={10}
                          className="font-mono text-sm"
                        />
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setPromptsState([...prompts])
                              setEditingPromptId(null)
                            }}
                          >
                            İptal
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleSavePrompt(prompt.id, prompt.prompt)}
                            disabled={saving}
                          >
                            {saving ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            {saving ? "Kaydediliyor..." : "Kaydet"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-3 rounded border text-sm font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {prompt.prompt.length > 200 
                          ? prompt.prompt.substring(0, 200) + "..." 
                          : prompt.prompt}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 text-indigo-600 mr-2" />
                  Hesap Bilgileri
                </CardTitle>
                <CardDescription>
                  Kişisel bilgilerinizi ve hesap ayarlarınızı yönetin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ornek@email.com"
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+90 555 123 45 67"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Adres</Label>
                  <Textarea
                    id="address"
                    placeholder="Tam adresiniz"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    Kaydet
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 text-yellow-600 mr-2" />
                  Bildirimler
                </CardTitle>
                <CardDescription>
                  Hangi bildirimleri almak istediğinizi seçin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Yeni sipariş bildirimleri</p>
                    <p className="text-sm text-gray-600">Yeni sipariş geldiğinde e-posta al</p>
                  </div>
                  <input type="checkbox" className="rounded" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Stok uyarıları</p>
                    <p className="text-sm text-gray-600">Stok azaldığında bildirim al</p>
                  </div>
                  <input type="checkbox" className="rounded" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Pazarlama önerileri</p>
                    <p className="text-sm text-gray-600">AI destekli pazarlama önerilerini al</p>
                  </div>
                  <input type="checkbox" className="rounded" />
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 text-red-600 mr-2" />
                  Güvenlik
                </CardTitle>
                <CardDescription>
                  Hesap güvenliğinizi yönetin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">İki faktörlü doğrulama</p>
                    <p className="text-sm text-gray-600">Hesabınız için ek güvenlik katmanı</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Etkinleştir
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Şifre değiştir</p>
                    <p className="text-sm text-gray-600">Hesap şifrenizi güncelleyin</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Değiştir
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
} 