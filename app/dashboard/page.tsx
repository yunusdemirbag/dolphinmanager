"use client"

import { useState, useEffect } from "react"
import { createClientSupabase } from "@/lib/supabase"
import DashboardClient from "./dashboard-client"
import { Loader2 } from "lucide-react"

interface CalendarEvent {
  date: string
  name: string
  description: string
  themes: string[]
  colors: string[]
  daysUntil: number
  priority: "high" | "medium" | "low"
  businessImpact: string
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [dashboardData, setDashboardData] = useState<any>({
    stores: [],
    revenue: 0,
    orders: 0,
    views: 0,
    favorites: 0,
    conversion_rate: 0,
    avg_order_value: 0,
    products: [],
    ordersList: [],
    chartData: [],
    revenueChange: 0,
    ordersChange: 0,
    viewsChange: 0,
    conversionChange: 0
  })
  const supabase = createClientSupabase()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Kullanıcı bilgilerini getir
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        // Profil bilgilerini getir
        const { data: profileData } = await supabase.from("profiles").select("*").single()
        setProfile(profileData)

        // Paralel olarak stores ve stats verilerini çek
        const [storesResponse, statsResponse] = await Promise.all([
          fetch('/api/etsy/stores'),
          fetch('/api/etsy/stats')
        ])

        let stores = []
        let stats = {
          totalListings: 0,
          totalOrders: 0,
          totalViews: 0,
          totalRevenue: 0
        }

        // Stores verilerini işle
        if (storesResponse.ok) {
          const storesData = await storesResponse.json()
          stores = storesData.stores || []
          console.log("📊 Stores loaded:", stores.length, "stores, source:", storesData.source)
        }

        // Stats verilerini işle
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          stats = {
            totalListings: statsData.totalListings || 0,
            totalOrders: statsData.totalOrders || 0,
            totalViews: statsData.totalViews || 0,
            totalRevenue: statsData.totalRevenue || 0
          }
          console.log("📊 Stats loaded:", stats, "source:", statsData.source)
        }

        // Dashboard verilerini güncelle
        setDashboardData({
          stores: stores,
          revenue: stats.totalRevenue,
          orders: stats.totalOrders,
          views: stats.totalViews,
          favorites: stores.reduce((acc: number, store: any) => acc + (store.num_favorers || 0), 0),
          conversion_rate: stats.totalViews > 0 ? ((stats.totalOrders / stats.totalViews) * 100).toFixed(1) : 0,
          avg_order_value: stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : 0,
          products: [],
          ordersList: [],
          chartData: [],
          revenueChange: 0,
          ordersChange: 0,
          viewsChange: 0,
          conversionChange: 0,
          totalListings: stats.totalListings
        })

      } catch (error) {
        console.error("Error fetching data:", error)
        // Hata durumunda boş veri göster
        setDashboardData({
          stores: [],
          revenue: 0,
          orders: 0,
          views: 0,
          favorites: 0,
          conversion_rate: 0,
          avg_order_value: 0,
          products: [],
          ordersList: [],
          chartData: [],
          revenueChange: 0,
          ordersChange: 0,
          viewsChange: 0,
          conversionChange: 0,
          totalListings: 0
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Etsy verileriniz yükleniyor...</p>
          <p className="text-sm text-gray-500 mt-2">Veritabanından veriler çekiliyor</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardClient 
      user={user}
      profile={profile}
      dashboardData={dashboardData}
    />
  )
}
