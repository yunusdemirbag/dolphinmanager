import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { getEtsyStores } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log("Auth error:", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Fetching Etsy stats for user:", user.id)

    try {
      // Etsy store bilgilerini çek
      const etsyStores = await getEtsyStores(user.id)
      
      if (etsyStores.length === 0) {
        return NextResponse.json({
          revenue: 0,
          orders: 0,
          views: 0,
          favorites: 0,
          conversion_rate: 0,
          avg_order_value: 0,
          connected: false,
          message: "No Etsy stores connected"
        })
      }

      // Basit istatistikler döndür (gerçek API'den gelecek)
      return NextResponse.json({
        revenue: 0,
        orders: 0,
        views: 0,
        favorites: 0,
        conversion_rate: 0,
        avg_order_value: 0,
        connected: true
      })

    } catch (etsyError: any) {
      console.error("Etsy API error:", etsyError)
      
      // Etsy bağlantı sorunu varsa boş veri döndür
      return NextResponse.json({
        revenue: 0,
        orders: 0,
        views: 0,
        favorites: 0,
        conversion_rate: 0,
        avg_order_value: 0,
        connected: false,
        error: etsyError.message
      })
    }

  } catch (error: any) {
    console.error("Stats API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats", details: error.message },
      { status: 500 }
    )
  }
} 