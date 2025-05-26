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
        <div className="text-center bg-white p-8 rounded-lg shadow-sm max-w-md mx-auto">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full"></div>
            <Loader2 className="h-16 w-16 animate-spin text-blue-600 absolute top-0 left-0" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Etsy Verileri Yükleniyor</h2>
          <p className="text-gray-600 mb-4">Mağaza performans verileri hazırlanıyor...</p>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '75%' }}></div>
          </div>
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
