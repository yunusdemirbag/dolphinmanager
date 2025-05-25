"use client"

import { useState, useEffect } from "react"
import { createClientSupabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Store, Package, ShoppingBag, BarChart3, LogOut, Settings } from "lucide-react"

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClientSupabase()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Profil bilgilerini getir
        const { data } = await supabase.from("profiles").select("*").single()
        setProfile(data)
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleLogout = async () => {
    window.location.href = "/onboarding"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dolphin Manager</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Hoş Geldiniz!</h2>
              <p className="opacity-90">
                {profile?.etsy_shop_name} mağazanız başarıyla bağlandı.
              </p>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <Store className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Package className="h-5 w-5 mr-2 text-blue-600" />
                Ürünler
              </CardTitle>
              <CardDescription>Ürün yönetimi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">-</div>
              <p className="text-sm text-gray-500">Toplam aktif ürün</p>
              <Button className="w-full mt-4" variant="outline">
                Ürünleri Görüntüle
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2 text-green-600" />
                Siparişler
              </CardTitle>
              <CardDescription>Sipariş takibi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">-</div>
              <p className="text-sm text-gray-500">Bekleyen sipariş</p>
              <Button className="w-full mt-4" variant="outline">
                Siparişleri Görüntüle
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                Analitikler
              </CardTitle>
              <CardDescription>Performans takibi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">-</div>
              <p className="text-sm text-gray-500">Bugünkü görüntülenme</p>
              <Button className="w-full mt-4" variant="outline">
                Analizleri Görüntüle
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
