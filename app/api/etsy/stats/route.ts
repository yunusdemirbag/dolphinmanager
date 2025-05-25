import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { getEtsyStores, calculateFinancialSummary } from "@/lib/etsy-api"

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

      console.log("Found Etsy stores:", etsyStores.length)
      const primaryStore = etsyStores[0] // İlk mağazayı kullan
      console.log("Getting stats for store:", primaryStore.shop_name)

      // Gerçek finansal verileri çek
      const financialSummary = await calculateFinancialSummary(
        user.id, 
        primaryStore.shop_id, 
        30 // Son 30 gün
      )

      console.log("Financial summary:", financialSummary)

      // Gerçek mağaza istatistiklerini kullan
      const stats = {
        revenue: financialSummary.totalRevenue,
        orders: financialSummary.totalOrders,
        views: 0, // Bu veri Etsy API'sinde yok, ayrı endpoint gerekli
        favorites: primaryStore.num_favorers || 0,
        listings: primaryStore.listing_active_count || 0,
        review_average: primaryStore.review_average || 0,
        review_count: primaryStore.review_count || 0,
        fees: financialSummary.totalFees,
        net_revenue: financialSummary.netRevenue,
        avg_order_value: financialSummary.averageOrderValue,
        conversion_rate: 0, // Hesaplanamıyor çünkü views verisi yok
        connected: true,
        currency: financialSummary.currency,
        period: "Son 30 gün",
        store: {
          shop_id: primaryStore.shop_id,
          shop_name: primaryStore.shop_name,
          url: primaryStore.url,
          currency: primaryStore.currency_code,
          is_vacation: primaryStore.is_vacation,
          title: primaryStore.title
        }
      }

      console.log("Returning stats:", stats)
      return NextResponse.json(stats)

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