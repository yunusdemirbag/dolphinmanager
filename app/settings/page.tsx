"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
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
  Clock,
  Brain,
  Sparkles,
  Sliders,
  MessageSquare
} from "lucide-react"
import { createClientSupabase } from "@/lib/supabase"
import CurrentStoreNameBadge from "../components/CurrentStoreNameBadge"
import { titlePrompt, tagPrompt, categoryPrompt, focusTitlePrompt } from "@/lib/openai-yonetim"

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

interface AISettings {
  model: string;
  temperature: number;
  title_prompt: string | null;
  tags_prompt: string | null;
  category_prompt: string | null;
  focus_title_prompt: string | null;
  
  // Her prompt için ayrı model ve temperature ayarları
  title_model: string | null;
  title_temperature: number | null;
  tags_model: string | null;
  tags_temperature: number | null;
  category_model: string | null;
  category_temperature: number | null;
  focus_title_model: string | null;
  focus_title_temperature: number | null;
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
  const [shippingForm, setShippingForm] = useState<CreateShippingForm>({
    title: "",
    origin_country_iso: "TR",
    primary_cost: 0,
    secondary_cost: 0,
    min_processing_time: 1,
    max_processing_time: 3,
    destination_region: "none"
  })
  const [aiSettings, setAiSettings] = useState<AISettings>({
    model: "gpt-4.1-mini",
    temperature: 0.7,
    title_prompt: null,
    tags_prompt: null,
    category_prompt: null,
    focus_title_prompt: null,
    
    // Her prompt için ayrı model ve temperature ayarları
    title_model: null,
    title_temperature: null,
    tags_model: null,
    tags_temperature: null,
    category_model: null,
    category_temperature: null,
    focus_title_model: null,
    focus_title_temperature: null
  });
  
  // Her prompt için özel ayarların etkin olup olmadığını tutan state'ler
  const [titleCustomSettings, setTitleCustomSettings] = useState(false);
  const [tagsCustomSettings, setTagsCustomSettings] = useState(false);
  const [categoryCustomSettings, setCategoryCustomSettings] = useState(false);
  const [focusTitleCustomSettings, setFocusTitleCustomSettings] = useState(false);
  
  const [savingAiSettings, setSavingAiSettings] = useState(false);
  const [aiSettingsLoaded, setAiSettingsLoaded] = useState(false);

  // Varsayılan prompt'ları tutacak state
  const [defaultPrompts, setDefaultPrompts] = useState({
    title: "",
    tags: "",
    category: "",
    focus_title: ""
  });

  // Varsayılan prompt'ları gösterme durumunu tutacak state
  const [showDefaultPrompts, setShowDefaultPrompts] = useState({
    title: false,
    tags: false,
    category: false,
    focus_title: false
  });

  useEffect(() => {
    loadSettings()
    loadAiSettings()
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

  const loadAiSettings = async () => {
    try {
      const response = await fetch('/api/ai/settings');
      if (response.ok) {
        const data = await response.json();
        setAiSettings(data);
        
        // Özel ayarların etkin olup olmadığını kontrol et
        setTitleCustomSettings(!!data.title_model);
        setTagsCustomSettings(!!data.tags_model);
        setCategoryCustomSettings(!!data.category_model);
        setFocusTitleCustomSettings(!!data.focus_title_model);

        // Varsayılan prompt'ları yükle
        setDefaultPrompts({
          title: titlePrompt.prompt,
          tags: tagPrompt.prompt,
          category: categoryPrompt.prompt,
          focus_title: focusTitlePrompt.prompt
        });
      } else {
        console.error('AI ayarları yüklenemedi');
      }
      setAiSettingsLoaded(true);
    } catch (error) {
      console.error('AI ayarları yükleme hatası:', error);
      setAiSettingsLoaded(true);
    }
  };

  const handleSaveAiSettings = async () => {
    setSavingAiSettings(true);
    try {
      const response = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiSettings),
      });

      if (response.ok) {
        alert('✅ AI ayarları başarıyla kaydedildi!');
      } else {
        const errorData = await response.json();
        alert(`❌ Hata: ${errorData.details || errorData.error}`);
      }
    } catch (error) {
      console.error('AI ayarları kaydetme hatası:', error);
      alert('❌ AI ayarları kaydedilemedi!');
    } finally {
      setSavingAiSettings(false);
    }
  };

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
            <TabsTrigger value="ai">AI Ayarları</TabsTrigger>
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

          {/* AI Settings */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Brain className="h-5 w-5 text-purple-600 mr-2" />
                  OpenAI Ayarları
                </CardTitle>
                <CardDescription>
                  AI modellerinin davranışını ve prompt'ları özelleştirin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!aiSettingsLoaded ? (
                  <div className="flex items-center justify-center py-6">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                      {/* Varsayılan AI Model Seçimi */}
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <h3 className="text-base font-medium mb-4">Varsayılan Ayarlar</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="ai-model">AI Modeli</Label>
                            <Select 
                              value={aiSettings.model} 
                              onValueChange={(value) => setAiSettings(prev => ({ ...prev, model: value }))}
                              disabled={titleCustomSettings || tagsCustomSettings || categoryCustomSettings || focusTitleCustomSettings}
                            >
                              <SelectTrigger className={titleCustomSettings || tagsCustomSettings || categoryCustomSettings || focusTitleCustomSettings ? "opacity-50" : ""}>
                                <SelectValue placeholder="Model seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gpt-4.1">GPT-4.1 (En Gelişmiş)</SelectItem>
                                <SelectItem value="gpt-4.1-mini">GPT-4.1-mini (Ekonomik)</SelectItem>
                                <SelectItem value="gpt-4.1-nano">GPT-4.1-nano (Hızlı)</SelectItem>
                                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Metin)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="temperature">Yaratıcılık Seviyesi</Label>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-500">Kesin</span>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={aiSettings.temperature}
                                onChange={(e) => setAiSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                                className="flex-1"
                                disabled={titleCustomSettings || tagsCustomSettings || categoryCustomSettings || focusTitleCustomSettings}
                              />
                              <span className="text-sm text-gray-500">Yaratıcı</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Değer: {aiSettings.temperature}</p>
                          </div>
                          
                          {(titleCustomSettings || tagsCustomSettings || categoryCustomSettings || focusTitleCustomSettings) && (
                            <div className="text-xs text-amber-500 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Özel ayarlar etkinleştirildiğinden varsayılan ayarlar devre dışı
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 pt-3 border-t">
                          <h4 className="text-sm font-medium mb-2">Model Özellikleri</h4>
                          <div className="space-y-2 text-xs text-gray-600">
                            <div className="flex items-start">
                              <div className="w-1/3">
                                <Badge variant="outline" className="bg-blue-50">GPT-4.1</Badge>
                              </div>
                              <div>Görsel destekli, 1M token bağlam, en güçlü model</div>
                            </div>
                            <div className="flex items-start">
                              <div className="w-1/3">
                                <Badge variant="outline" className="bg-blue-50">GPT-4.1-mini</Badge>
                              </div>
                              <div>Görsel destekli, ekonomik, düşük gecikme</div>
                            </div>
                            <div className="flex items-start">
                              <div className="w-1/3">
                                <Badge variant="outline" className="bg-blue-50">GPT-4.1-nano</Badge>
                              </div>
                              <div>Görsel destekli, en hızlı ve ekonomik</div>
                            </div>
                            <div className="flex items-start">
                              <div className="w-1/3">
                                <Badge variant="outline" className="bg-gray-100">GPT-3.5 Turbo</Badge>
                              </div>
                              <div>Sadece metin, görsel desteklemez</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Prompt Ayarları */}
                      <div className="space-y-4">
                        <h3 className="text-base font-medium flex items-center">
                          <Sparkles className="h-5 w-5 text-amber-500 mr-2" />
                          Özel Prompt Ayarları
                        </h3>
                        
                        {/* Başlık Prompt'u */}
                        <div className="border rounded-lg">
                          <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                            <Label htmlFor="title-prompt" className="font-medium">Başlık Prompt'u</Label>
                            <div className="flex items-center">
                              <Switch 
                                id="title-custom-settings"
                                checked={titleCustomSettings}
                                onCheckedChange={(checked) => {
                                  setTitleCustomSettings(checked);
                                  if (!checked) {
                                    setAiSettings(prev => ({
                                      ...prev,
                                      title_model: null,
                                      title_temperature: null
                                    }));
                                  } else {
                                    setAiSettings(prev => ({
                                      ...prev,
                                      title_model: prev.model,
                                      title_temperature: prev.temperature
                                    }));
                                  }
                                }}
                                className="mr-2"
                              />
                              <Label htmlFor="title-custom-settings" className="text-sm cursor-pointer">
                                Özel Model/Yaratıcılık
                              </Label>
                            </div>
                          </div>
                          
                          {titleCustomSettings && (
                            <div className="p-3 border-b space-y-3 bg-gray-50/50">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="title-model" className="text-sm">Model</Label>
                                  <Select 
                                    value={aiSettings.title_model || aiSettings.model} 
                                    onValueChange={(value) => setAiSettings(prev => ({ ...prev, title_model: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Model seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                                      <SelectItem value="gpt-4.1-mini">GPT-4.1-mini</SelectItem>
                                      <SelectItem value="gpt-4.1-nano">GPT-4.1-nano</SelectItem>
                                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label htmlFor="title-temperature" className="text-sm">Yaratıcılık</Label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      value={aiSettings.title_temperature !== null ? aiSettings.title_temperature : aiSettings.temperature}
                                      onChange={(e) => setAiSettings(prev => ({ ...prev, title_temperature: parseFloat(e.target.value) }))}
                                      className="flex-1"
                                    />
                                    <span className="text-xs w-6">
                                      {aiSettings.title_temperature !== null ? aiSettings.title_temperature : aiSettings.temperature}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="p-3">
                            <Textarea
                              id="title-prompt"
                              value={aiSettings.title_prompt || ''}
                              onChange={(e) => setAiSettings(prev => ({ ...prev, title_prompt: e.target.value }))}
                              placeholder={showDefaultPrompts.title ? defaultPrompts.title : "Varsayılan başlık prompt'unu kullanmak için boş bırakın"}
                              rows={showDefaultPrompts.title ? 8 : 3}
                            />
                            <div className="flex space-x-2 mt-1">
                              <Button 
                                variant="link" 
                                className="text-xs p-0 h-auto"
                                onClick={() => setAiSettings(prev => ({ ...prev, title_prompt: null }))}
                              >
                                Varsayılana sıfırla
                              </Button>
                              <Button 
                                variant="link" 
                                className="text-xs p-0 h-auto"
                                onClick={() => setShowDefaultPrompts(prev => ({ ...prev, title: !prev.title }))}
                              >
                                {showDefaultPrompts.title ? "Varsayılanı Gizle" : "Varsayılanı Göster"}
                              </Button>
                              <Button 
                                variant="link" 
                                className="text-xs p-0 h-auto"
                                onClick={() => setAiSettings(prev => ({ ...prev, title_prompt: defaultPrompts.title }))}
                              >
                                Varsayılanı Yükle
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Etiket Prompt'u */}
                        <div className="border rounded-lg">
                          <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                            <Label htmlFor="tags-prompt" className="font-medium">Etiket Prompt'u</Label>
                            <div className="flex items-center">
                              <Switch 
                                id="tags-custom-settings"
                                checked={tagsCustomSettings}
                                onCheckedChange={(checked) => {
                                  setTagsCustomSettings(checked);
                                  if (!checked) {
                                    setAiSettings(prev => ({
                                      ...prev,
                                      tags_model: null,
                                      tags_temperature: null
                                    }));
                                  } else {
                                    setAiSettings(prev => ({
                                      ...prev,
                                      tags_model: prev.model,
                                      tags_temperature: prev.temperature
                                    }));
                                  }
                                }}
                                className="mr-2"
                              />
                              <Label htmlFor="tags-custom-settings" className="text-sm cursor-pointer">
                                Özel Model/Yaratıcılık
                              </Label>
                            </div>
                          </div>
                          
                          {tagsCustomSettings && (
                            <div className="p-3 border-b space-y-3 bg-gray-50/50">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="tags-model" className="text-sm">Model</Label>
                                  <Select 
                                    value={aiSettings.tags_model || aiSettings.model} 
                                    onValueChange={(value) => setAiSettings(prev => ({ ...prev, tags_model: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Model seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                                      <SelectItem value="gpt-4.1-mini">GPT-4.1-mini</SelectItem>
                                      <SelectItem value="gpt-4.1-nano">GPT-4.1-nano</SelectItem>
                                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label htmlFor="tags-temperature" className="text-sm">Yaratıcılık</Label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      value={aiSettings.tags_temperature !== null ? aiSettings.tags_temperature : aiSettings.temperature}
                                      onChange={(e) => setAiSettings(prev => ({ ...prev, tags_temperature: parseFloat(e.target.value) }))}
                                      className="flex-1"
                                    />
                                    <span className="text-xs w-6">
                                      {aiSettings.tags_temperature !== null ? aiSettings.tags_temperature : aiSettings.temperature}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="p-3">
                            <Textarea
                              id="tags-prompt"
                              value={aiSettings.tags_prompt || ''}
                              onChange={(e) => setAiSettings(prev => ({ ...prev, tags_prompt: e.target.value }))}
                              placeholder={showDefaultPrompts.tags ? defaultPrompts.tags : "Varsayılan etiket prompt'unu kullanmak için boş bırakın"}
                              rows={showDefaultPrompts.tags ? 8 : 3}
                            />
                            <div className="flex space-x-2 mt-1">
                              <Button 
                                variant="link" 
                                className="text-xs p-0 h-auto"
                                onClick={() => setAiSettings(prev => ({ ...prev, tags_prompt: null }))}
                              >
                                Varsayılana sıfırla
                              </Button>
                              <Button 
                                variant="link" 
                                className="text-xs p-0 h-auto"
                                onClick={() => setShowDefaultPrompts(prev => ({ ...prev, tags: !prev.tags }))}
                              >
                                {showDefaultPrompts.tags ? "Varsayılanı Gizle" : "Varsayılanı Göster"}
                              </Button>
                              <Button 
                                variant="link" 
                                className="text-xs p-0 h-auto"
                                onClick={() => setAiSettings(prev => ({ ...prev, tags_prompt: defaultPrompts.tags }))}
                              >
                                Varsayılanı Yükle
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Kategori Seçimi Prompt'u */}
                        <div className="border rounded-lg">
                          <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                            <Label htmlFor="category-prompt" className="font-medium">Kategori Seçimi Prompt'u</Label>
                            <div className="flex items-center">
                              <Switch 
                                id="category-custom-settings"
                                checked={categoryCustomSettings}
                                onCheckedChange={(checked) => {
                                  setCategoryCustomSettings(checked);
                                  if (!checked) {
                                    setAiSettings(prev => ({
                                      ...prev,
                                      category_model: null,
                                      category_temperature: null
                                    }));
                                  } else {
                                    setAiSettings(prev => ({
                                      ...prev,
                                      category_model: prev.model,
                                      category_temperature: prev.temperature
                                    }));
                                  }
                                }}
                                className="mr-2"
                              />
                              <Label htmlFor="category-custom-settings" className="text-sm cursor-pointer">
                                Özel Model/Yaratıcılık
                              </Label>
                            </div>
                          </div>
                          
                          {categoryCustomSettings && (
                            <div className="p-3 border-b space-y-3 bg-gray-50/50">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="category-model" className="text-sm">Model</Label>
                                  <Select 
                                    value={aiSettings.category_model || aiSettings.model} 
                                    onValueChange={(value) => setAiSettings(prev => ({ ...prev, category_model: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Model seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                                      <SelectItem value="gpt-4.1-mini">GPT-4.1-mini</SelectItem>
                                      <SelectItem value="gpt-4.1-nano">GPT-4.1-nano</SelectItem>
                                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label htmlFor="category-temperature" className="text-sm">Yaratıcılık</Label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      value={aiSettings.category_temperature !== null ? aiSettings.category_temperature : aiSettings.temperature}
                                      onChange={(e) => setAiSettings(prev => ({ ...prev, category_temperature: parseFloat(e.target.value) }))}
                                      className="flex-1"
                                    />
                                    <span className="text-xs w-6">
                                      {aiSettings.category_temperature !== null ? aiSettings.category_temperature : aiSettings.temperature}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="p-3">
                            <Textarea
                              id="category-prompt"
                              value={aiSettings.category_prompt || ''}
                              onChange={(e) => setAiSettings(prev => ({ ...prev, category_prompt: e.target.value }))}
                              placeholder={showDefaultPrompts.category ? defaultPrompts.category : "Varsayılan kategori prompt'unu kullanmak için boş bırakın"}
                              rows={showDefaultPrompts.category ? 8 : 3}
                            />
                            <div className="flex space-x-2 mt-1">
                              <Button 
                                variant="link" 
                                className="text-xs p-0 h-auto"
                                onClick={() => setAiSettings(prev => ({ ...prev, category_prompt: null }))}
                              >
                                Varsayılana sıfırla
                              </Button>
                              <Button 
                                variant="link" 
                                className="text-xs p-0 h-auto"
                                onClick={() => setShowDefaultPrompts(prev => ({ ...prev, category: !prev.category }))}
                              >
                                {showDefaultPrompts.category ? "Varsayılanı Gizle" : "Varsayılanı Göster"}
                              </Button>
                              <Button 
                                variant="link" 
                                className="text-xs p-0 h-auto"
                                onClick={() => setAiSettings(prev => ({ ...prev, category_prompt: defaultPrompts.category }))}
                              >
                                Varsayılanı Yükle
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Odaklı Başlık Prompt'u */}
                        <div className="border rounded-lg">
                          <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                            <Label htmlFor="focus-title-prompt" className="font-medium">Odaklı Başlık Prompt'u</Label>
                            <div className="flex items-center">
                              <Switch 
                                id="focus-title-custom-settings"
                                checked={focusTitleCustomSettings}
                                onCheckedChange={(checked) => {
                                  setFocusTitleCustomSettings(checked);
                                  if (!checked) {
                                    setAiSettings(prev => ({
                                      ...prev,
                                      focus_title_model: null,
                                      focus_title_temperature: null
                                    }));
                                  } else {
                                    setAiSettings(prev => ({
                                      ...prev,
                                      focus_title_model: prev.model,
                                      focus_title_temperature: prev.temperature
                                    }));
                                  }
                                }}
                                className="mr-2"
                              />
                              <Label htmlFor="focus-title-custom-settings" className="text-sm cursor-pointer">
                                Özel Model/Yaratıcılık
                              </Label>
                            </div>
                          </div>
                          
                          {focusTitleCustomSettings && (
                            <div className="p-3 border-b space-y-3 bg-gray-50/50">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="focus-title-model" className="text-sm">Model</Label>
                                  <Select 
                                    value={aiSettings.focus_title_model || aiSettings.model} 
                                    onValueChange={(value) => setAiSettings(prev => ({ ...prev, focus_title_model: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Model seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                                      <SelectItem value="gpt-4.1-mini">GPT-4.1-mini</SelectItem>
                                      <SelectItem value="gpt-4.1-nano">GPT-4.1-nano</SelectItem>
                                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label htmlFor="focus-title-temperature" className="text-sm">Yaratıcılık</Label>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.1"
                                      value={aiSettings.focus_title_temperature !== null ? aiSettings.focus_title_temperature : aiSettings.temperature}
                                      onChange={(e) => setAiSettings(prev => ({ ...prev, focus_title_temperature: parseFloat(e.target.value) }))}
                                      className="flex-1"
                                    />
                                    <span className="text-xs w-6">
                                      {aiSettings.focus_title_temperature !== null ? aiSettings.focus_title_temperature : aiSettings.temperature}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="p-3">
                            <Textarea
                              id="focus-title-prompt"
                              value={aiSettings.focus_title_prompt || ''}
                              onChange={(e) => setAiSettings(prev => ({ ...prev, focus_title_prompt: e.target.value }))}
                              placeholder={showDefaultPrompts.focus_title ? defaultPrompts.focus_title : "Varsayılan odaklı başlık prompt'unu kullanmak için boş bırakın"}
                              rows={showDefaultPrompts.focus_title ? 8 : 3}
                            />
                            <div className="flex space-x-2 mt-1">
                              <Button 
                                variant="link" 
                                className="text-xs p-0 h-auto"
                                onClick={() => setAiSettings(prev => ({ ...prev, focus_title_prompt: null }))}
                              >
                                Varsayılana sıfırla
                              </Button>
                              <Button 
                                variant="link" 
                                className="text-xs p-0 h-auto"
                                onClick={() => setShowDefaultPrompts(prev => ({ ...prev, focus_title: !prev.focus_title }))}
                              >
                                {showDefaultPrompts.focus_title ? "Varsayılanı Gizle" : "Varsayılanı Göster"}
                              </Button>
                              <Button 
                                variant="link" 
                                className="text-xs p-0 h-auto"
                                onClick={() => setAiSettings(prev => ({ ...prev, focus_title_prompt: defaultPrompts.focus_title }))}
                              >
                                Varsayılanı Yükle
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <Button 
                        onClick={handleSaveAiSettings} 
                        disabled={savingAiSettings}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {savingAiSettings ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {savingAiSettings ? "Kaydediliyor..." : "Ayarları Kaydet"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 text-green-600 mr-2" />
                  Varsayılan Prompt'lar
                </CardTitle>
                <CardDescription>
                  Sistemde tanımlı olan varsayılan prompt'lar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium">Başlık Prompt'u</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
                      {`You are an elite Etsy SEO copy-writer who specialises in PHYSICAL canvas wall art (NOT digital).
STEP 1 — IMAGE ANALYSIS  
• Identify the MAIN SUBJECT (woman, animal species, landscape, abstract form, floral, religious icon, etc.).  
• If a HUMAN: note gender and clear cultural identity when obvious (e.g. Black Woman, Asian Man).  
• If an ANIMAL: name the exact species (lion, flamingo, giraffe…).  
• Detect the ART STYLE (abstract, minimalist, pop art, line art, cubist, ukiyo-e, graffiti, etc.).  
• Capture the EMOTIONAL TONE (bold, calming, empowering, romantic, mystical, meditative…).  
• Note the 1-2 most eye-catching DOMINANT COLORS (gold, turquoise, black & white, etc.).
STEP 2 — TITLE CONSTRUCTION  ≤ 135 characters  
Format:  
  <Emotive Adjective> <Primary Subject> <Art Style(optional)> Canvas Wall Art Print | <Color/Tone> <Room Keyword> Decor | <Final Keyword>  
Mandatory rules  
• Include **exactly once** the phrase "Canvas Wall Art Print".  
• Use popular buyer phrases such as Living Room Decor, Bedroom Wall Decor, Office Artwork, Zen Meditation, Gift for Him/Her.  
• No duplicated words, no filler like "beautiful", no quotes, no parentheses.  
• Use Title Case. If length exceeds 135 c, remove the least-important phrase.`}
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium">Etiket Prompt'u</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
                      {`You are an Etsy canvas wall art SEO expert.
1. Using the image AND the generated title, create **exactly 13 tags**.  
2. Each tag must be ≤ 19 characters, including spaces. Use 2- or 3-word phrases.  
3. Lowercase only, no punctuation except single spaces.  
4. No word may appear more than twice across all tags.  
5. Cover a mix of subject, style, colors, mood, target room, and gift occasion.  
6. Output the tags in one line, comma-separated, with no quotes or extra text.`}
                    </p>
                  </div>
                </div>
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