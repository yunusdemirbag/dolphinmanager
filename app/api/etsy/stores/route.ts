import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
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

    console.log("Fetching Etsy stores for user:", user.id)

    try {
      // Etsy store bilgilerini çek
      const etsyStores = await getEtsyStores(user.id)
      
      if (etsyStores.length === 0) {
        return NextResponse.json({
          stores: [],
          connected: false,
          message: "No Etsy stores connected"
        })
      }

      // Store verilerini formatla
      const formattedStores = etsyStores.map(store => ({
        shop_id: store.shop_id,
        shop_name: store.shop_name,
        title: store.title,
        listing_active_count: store.listing_active_count,
        num_favorers: store.num_favorers,
        is_active: !store.is_vacation,
        review_average: store.review_average,
        review_count: store.review_count,
        currency_code: store.currency_code,
        url: store.url,
        last_synced_at: new Date().toISOString(),
        connection_status: 'connected',
        // Mock performance data - gerçek API'den çekilebilir
        monthly_revenue: Math.floor(Math.random() * 20000) + 5000,
        monthly_orders: Math.floor(Math.random() * 150) + 20,
        monthly_views: Math.floor(Math.random() * 15000) + 2000,
        conversion_rate: Math.round((Math.random() * 2 + 0.5) * 10) / 10,
        trend: Math.random() > 0.5 ? 'up' : 'down'
      }))
      
      console.log("Real Etsy stores fetched successfully:", formattedStores.length)
      
      return NextResponse.json({
        stores: formattedStores,
        connected: true,
        lastUpdate: new Date().toISOString()
      })

    } catch (etsyError) {
      console.error("Etsy API error:", etsyError)
      
      // Etsy API hatası durumunda boş liste döndür
      return NextResponse.json({
        stores: [],
        connected: false,
        error: "Etsy connection failed",
        message: etsyError instanceof Error ? etsyError.message : "Unknown error"
      })
    }

  } catch (error) {
    console.error("Stores API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 