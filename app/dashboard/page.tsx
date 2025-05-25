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

        // Gerçek Etsy verilerini çekmeye çalış
        try {
          const response = await fetch('/api/etsy/stats', {
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
          })
          
          if (response.ok) {
            const etsyStats = await response.json()
            
            setDashboardData({
              stores: etsyStats.stores || [],
              revenue: etsyStats.totalRevenue || 0,
              orders: etsyStats.totalOrders || 0,
              views: etsyStats.totalViews || 0,
              favorites: etsyStats.totalFavorites || 0,
              conversion_rate: etsyStats.conversionRate || 0,
              avg_order_value: etsyStats.avgOrderValue || 0,
              products: etsyStats.products || [],
              ordersList: etsyStats.ordersList || [],
              chartData: etsyStats.chartData || [],
              revenueChange: etsyStats.revenueChange || 0,
              ordersChange: etsyStats.ordersChange || 0,
              viewsChange: etsyStats.viewsChange || 0,
              conversionChange: etsyStats.conversionChange || 0
            })
          } else {
            // API'den veri çekilemezse boş veri göster
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
              conversionChange: 0
            })
          }
        } catch (apiError) {
          console.error("Etsy API error:", apiError)
          // Etsy API'den veri çekilemezse boş veri göster
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
            conversionChange: 0
          })
        }
      } catch (error) {
        console.error("Error fetching data:", error)
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
          <p className="text-gray-600">Yükleniyor...</p>
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
