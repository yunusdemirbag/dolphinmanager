import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { getEtsyStores, shouldUseOnlyCachedData } from "@/lib/etsy-api"

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

    // Check for the X-Use-Cache-Only header
    const useCacheOnly = request.headers.get('X-Use-Cache-Only') === 'true' || shouldUseOnlyCachedData
    
    console.log("Fetching Etsy stores for user:", user.id)
    console.log("Cached-only mode:", useCacheOnly ? "ENABLED" : "DISABLED")

    try {
      // If useCacheOnly is true, we'll force the API to only use cached data
      // skipCache parameter is the opposite - if true, it forces fresh data from API
      const skipCache = !useCacheOnly
      const etsyStores = await getEtsyStores(user.id, skipCache)
      
      if (etsyStores && etsyStores.length > 0) {
        console.log("✅ Real Etsy data found:", etsyStores.length, "stores")
        const storeData = etsyStores.map(store => ({
          shop_id: store.shop_id,
          shop_name: store.shop_name,
          title: store.title,
          listing_active_count: store.listing_active_count,
          num_favorers: store.num_favorers,
          is_active: store.is_active || true,
          review_average: store.review_average,
          review_count: store.review_count,
          currency_code: store.currency_code,
          url: store.url,
          last_synced_at: store.last_synced_at || new Date().toISOString(),
          connection_status: 'connected',
          avatar_url: store.avatar_url || null
        }))
        return NextResponse.json({
          stores: storeData,
          connected: true,
          source: useCacheOnly ? "cached_data" : "etsy_api"
        })
      }
    } catch (error) {
      console.error("Error fetching Etsy stores:", error)
    }

    // Etsy'den veri yoksa profile'a bakalım
    let profile = null;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("Error getting profile data:", error);
      } else {
        profile = data;
      }
    } catch (err) {
      console.error("Exception getting profile:", err);
    }
    
    // Check if user has an active Etsy connection
    // First, check if they have tokens
    const { data: tokens, error: tokenError } = await supabase
      .from("etsy_tokens")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
    
    const hasActiveTokens = !!tokens

    // Eğer profile'da Etsy bilgisi varsa ve token kayıtları varsa mock store oluştur
    if (profile?.etsy_shop_name && profile.etsy_shop_name !== "pending" && hasActiveTokens) {
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
        avatar_url: null,
        connection_status: 'connected',
        is_active: true,
        last_synced_at: new Date().toISOString()
      }

      return NextResponse.json({
        stores: [mockStore],
        connected: true,
        source: "database_fallback"
      })
    }

    // Eğer bağlantı kesildiyse boş array döndür (demo gösterme)
    if (!hasActiveTokens) {
      console.log("🔌 No active Etsy connection, returning empty stores array")
      return NextResponse.json({
        stores: [],
        connected: false,
        source: "no_connection"
      })
    }

    // Hiçbir veri yoksa varsayılan mağaza döndür
    console.log("📦 Using default store data")
    
    const defaultStore = {
      shop_id: 51859104,
      shop_name: "CanvasesWorldTR",
      title: "CanvasesWorldTR",
      announcement: "Canvas wall art ve dekoratif ürünler",
      currency_code: "USD",
      is_vacation: false,
      listing_active_count: 763,
      num_favorers: 10,
      url: "https://www.etsy.com/shop/CanvasesWorldTR",
      image_url_760x100: "",
      review_count: 12,
      review_average: 4.4167,
      avatar_url: null,
      connection_status: 'demo',
      is_active: true,
      last_synced_at: new Date().toISOString()
    }

    return NextResponse.json({
      stores: [defaultStore],
      connected: true,
      source: "default_fallback"
    })

  } catch (error) {
    console.error("Stores API error:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch stores", 
        details: error instanceof Error ? error.message : String(error),
        stores: [],
        connected: false
      },
      { status: 500 }
    )
  }
} 