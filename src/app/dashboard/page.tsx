"use client"

import { useState, useEffect } from "react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
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
  const [dataSource, setDataSource] = useState<"cache" | "api">("cache")
  const [lastDataFetch, setLastDataFetch] = useState<Date | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Firebase auth ile kullanıcı bilgilerini getir
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          setUser(user)

          if (user) {
            // Profil bilgilerini API'den getir
            try {
              const response = await fetch('/api/user/profile', {
                headers: {
                  'Authorization': `Bearer ${await user.getIdToken()}`
                }
              })
              if (response.ok) {
                const profileData = await response.json()
                setProfile(profileData)
                
                // Son veri çekme zamanını profilden al
                if (profileData?.last_sync_attempt_at) {
                  const lastFetchDate = new Date(profileData.last_sync_attempt_at);
                  setLastDataFetch(lastFetchDate);
                  console.log(`📅 Son veri çekme zamanı: ${lastFetchDate.toLocaleString()}`);
                }
              }
            } catch (error) {
              console.error('Profil bilgileri alınamadı:', error)
            }
          }
        })
        
        return () => unsubscribe()
      } catch (error) {
        console.error('Auth state change error:', error)
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
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Toplam Gelir</h3>
            <p className="text-2xl font-bold text-green-600">₺0</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Siparişler</h3>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Görüntülemeler</h3>
            <p className="text-2xl font-bold text-purple-600">0</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Favoriler</h3>
            <p className="text-2xl font-bold text-yellow-600">0</p>
          </div>
        </div>
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Firebase geçişi tamamlandı</h2>
          <p className="text-gray-600">
            Supabase referansları kaldırıldı ve Firebase altyapısına geçiş yapıldı.
            Dashboard verilerini görmek için API route'ları güncellenmesi gerekiyor.
          </p>
        </div>
      </div>
    </div>
  )
}
