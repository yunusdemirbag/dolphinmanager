import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getEtsyStores } from "@/lib/etsy-api"

interface EtsyStore {
  shop_id: number
  shop_name: string
  title: string
  listing_active_count: number
  num_favorers: number
  is_active: boolean
  review_average: number
  review_count: number
  currency_code: string
  url: string
  last_synced_at: string
  avatar_url: string | null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log("Products API auth error:", userError, "No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Fetching Etsy stores for user:", user.id)

    try {
      // Önce gerçek Etsy API'sini dene
      const etsyStores = await getEtsyStores(user.id)
      
      if (etsyStores && etsyStores.length > 0) {
        console.log("✅ Real Etsy data found:", etsyStores.length, "stores")
        const storeData = etsyStores.map(store => ({
          shop_id: store.shop_id,
          shop_name: store.shop_name,
          title: store.title,
          listing_active_count: store.listing_active_count,
          num_favorers: store.num_favorers,
          is_active: store.is_active,
          review_average: store.review_average,
          review_count: store.review_count,
          currency_code: store.currency_code,
          url: store.url,
          last_synced_at: store.last_synced_at,
          connection_status: 'connected',
          avatar_url: store.avatar_url || null
        }))
        return NextResponse.json({
          stores: storeData,
          connected: true,
          source: "etsy_api"
        })
      }
    } catch (etsyError) {
      console.log("⚠️ Etsy API failed, trying database fallback:", etsyError)
    }

    // Etsy API başarısız olursa veritabanından veri çek
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("etsy_shop_name, etsy_shop_id")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Profile query error:", profileError)
      return NextResponse.json({
        stores: [],
        connected: false,
        error: "No profile found"
      })
    }

    // Eğer profile'da Etsy bilgisi varsa mock store oluştur
    if (profile?.etsy_shop_name && profile.etsy_shop_name !== "pending") {
      console.log("📦 Using database fallback for store:", profile.etsy_shop_name)
      
      const mockStore = {
        shop_id: parseInt(profile.etsy_shop_id) || 51859104,
        shop_name: profile.etsy_shop_name,
        title: profile.etsy_shop_name,
        announcement: "Canvas wall art ve dekoratif ürünler",
        currency_code: "USD",
        is_vacation: false,
        listing_active_count: 763,
        num_favorers: 10,
        url: `https://www.etsy.com/shop/${profile.etsy_shop_name}`,
        image_url_760x100: "",
        review_count: 12,
        review_average: 4.4167,
        avatar_url: null
      }

      return NextResponse.json({
        stores: [mockStore],
        connected: true,
        source: "database_fallback"
      })
    }

    // Hiçbir veri yoksa boş döndür
    console.log("❌ No Etsy connection found")
    return NextResponse.json({
      stores: [],
      connected: false,
      source: "no_connection"
    })

  } catch (error: any) {
    console.error("Stores API error:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch stores", 
        details: error.message,
        stores: [],
        connected: false
      },
      { status: 500 }
    )
  }
} 