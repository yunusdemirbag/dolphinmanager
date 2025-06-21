"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, Settings, Truck } from "lucide-react"

interface ShippingProfile {
  shipping_profile_id: number
  title: string
  min_processing_days: number
  max_processing_days: number
  origin_country_iso: string
  primary_cost: number
  secondary_cost: number
  min_delivery_days: number
  max_delivery_days: number
}

export default function ShippingProfilesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profiles, setProfiles] = useState<ShippingProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<ShippingProfile | null>(null)

  // Kargo profillerini yükle
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const response = await fetch('/api/etsy/shipping-profiles')
        if (response.ok) {
          const data = await response.json()
          setProfiles(data.profiles || [])
        }
      } catch (error) {
        console.error('Error loading shipping profiles:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfiles()
  }, [])

  // Yeni profil oluştur
  const handleCreateProfile = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/etsy/shipping-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Yeni Kargo Profili',
          origin_country_iso: 'TR',
          min_processing_days: 1,
          max_processing_days: 3,
          primary_cost: 0,
          secondary_cost: 0,
          min_delivery_days: 3,
          max_delivery_days: 7,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setProfiles([...profiles, data.profile])
        setSelectedProfile(data.profile)
      }
    } catch (error) {
      console.error('Error creating shipping profile:', error)
    } finally {
      setSaving(false)
    }
  }

  // Profili güncelle
  const handleUpdateProfile = async (profile: ShippingProfile) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/etsy/shipping-profiles/${profile.shipping_profile_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      })

      if (response.ok) {
        const data = await response.json()
        setProfiles(profiles.map(p => 
          p.shipping_profile_id === profile.shipping_profile_id ? data.profile : p
        ))
        setSelectedProfile(data.profile)
      }
    } catch (error) {
      console.error('Error updating shipping profile:', error)
    } finally {
      setSaving(false)
    }
  }

  // Profili sil
  const handleDeleteProfile = async (profileId: number) => {
    if (!confirm('Bu kargo profilini silmek istediğinizden emin misiniz?')) return

    setSaving(true)
    try {
      const response = await fetch(`/api/etsy/shipping-profiles/${profileId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setProfiles(profiles.filter(p => p.shipping_profile_id !== profileId))
        setSelectedProfile(null)
      }
    } catch (error) {
      console.error('Error deleting shipping profile:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kargo Profilleri</h1>
          <p className="text-gray-500">Etsy mağazanız için kargo profillerini yönetin</p>
        </div>
        <Button onClick={handleCreateProfile} disabled={saving}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Profil
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Profil Listesi */}
        <div className="col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Profiller</CardTitle>
              <CardDescription>Mevcut kargo profilleriniz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {profiles.map(profile => (
                <Button
                  key={profile.shipping_profile_id}
                  variant={selectedProfile?.shipping_profile_id === profile.shipping_profile_id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedProfile(profile)}
                >
                  <Truck className="w-4 h-4 mr-2" />
                  {profile.title}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Profil Detayları */}
        {selectedProfile && (
          <div className="col-span-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {selectedProfile.title}
                </CardTitle>
                <CardDescription>Kargo profili ayarlarını düzenleyin</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="general">
                  <TabsList>
                    <TabsTrigger value="general">Genel</TabsTrigger>
                    <TabsTrigger value="domestic">Yurt İçi</TabsTrigger>
                    <TabsTrigger value="international">Yurt Dışı</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4">
                    <div>
                      <Label htmlFor="title">Profil Adı</Label>
                      <Input
                        id="title"
                        value={selectedProfile.title}
                        onChange={(e) => setSelectedProfile({ ...selectedProfile, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="origin">Gönderim Ülkesi</Label>
                      <Select
                        value={selectedProfile.origin_country_iso}
                        onValueChange={(value) => setSelectedProfile({ ...selectedProfile, origin_country_iso: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Ülke seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TR">Türkiye</SelectItem>
                          <SelectItem value="US">Amerika Birleşik Devletleri</SelectItem>
                          <SelectItem value="GB">Birleşik Krallık</SelectItem>
                          <SelectItem value="DE">Almanya</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min_processing_days">Min. Hazırlık Süresi (Gün)</Label>
                        <Input
                          id="min_processing_days"
                          type="number"
                          min="1"
                          max="30"
                          value={selectedProfile.min_processing_days}
                          onChange={(e) => setSelectedProfile({ ...selectedProfile, min_processing_days: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="max_processing_days">Max. Hazırlık Süresi (Gün)</Label>
                        <Input
                          id="max_processing_days"
                          type="number"
                          min="1"
                          max="30"
                          value={selectedProfile.max_processing_days}
                          onChange={(e) => setSelectedProfile({ ...selectedProfile, max_processing_days: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="domestic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primary_cost">Ana Kargo Ücreti ($)</Label>
                        <Input
                          id="primary_cost"
                          type="number"
                          step="0.01"
                          value={selectedProfile.primary_cost}
                          onChange={(e) => setSelectedProfile({ ...selectedProfile, primary_cost: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="secondary_cost">Ek Ürün Ücreti ($)</Label>
                        <Input
                          id="secondary_cost"
                          type="number"
                          step="0.01"
                          value={selectedProfile.secondary_cost}
                          onChange={(e) => setSelectedProfile({ ...selectedProfile, secondary_cost: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min_delivery_days">Min. Teslimat Süresi (Gün)</Label>
                        <Input
                          id="min_delivery_days"
                          type="number"
                          min="1"
                          max="30"
                          value={selectedProfile.min_delivery_days}
                          onChange={(e) => setSelectedProfile({ ...selectedProfile, min_delivery_days: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="max_delivery_days">Max. Teslimat Süresi (Gün)</Label>
                        <Input
                          id="max_delivery_days"
                          type="number"
                          min="1"
                          max="30"
                          value={selectedProfile.max_delivery_days}
                          onChange={(e) => setSelectedProfile({ ...selectedProfile, max_delivery_days: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="international" className="space-y-4">
                    <div className="p-8 text-center text-gray-500">
                      Yurt dışı gönderim ayarları yakında eklenecek
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteProfile(selectedProfile.shipping_profile_id)}
                  disabled={saving}
                >
                  Profili Sil
                </Button>
                <Button
                  onClick={() => handleUpdateProfile(selectedProfile)}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    'Değişiklikleri Kaydet'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
} 