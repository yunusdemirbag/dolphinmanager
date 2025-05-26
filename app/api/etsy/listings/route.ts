import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEtsyListings, getEtsyStores } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log("Listings API auth error:", userError, "No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parametreleri al
    const searchParams = request.nextUrl.searchParams
    const shop_id_param = searchParams.get("shop_id") || "0" // "shop_id" parametresi
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "100") // Varsayılan limiti 100'e çıkardık
    const offset = (page - 1) * limit
    const state = (searchParams.get("state") || "active") as "active" | "inactive" | "draft" | "expired" | "all"
    const skipCache = searchParams.get("skip_cache") === "true"

    console.log(`API parameters: page=${page}, limit=${limit}, offset=${offset}, state=${state}, skipCache=${skipCache}`)

    // shop_id parametresi yoksa, kullanıcının mağazalarını al ve ilk mağazayı kullan
    if (!shop_id_param || shop_id_param === "0") {
      console.log("No shop_id provided, attempting to find user's first store")
      try {
        const stores = await getEtsyStores(user.id, skipCache)
        if (stores && stores.length > 0) {
          const firstStoreId = stores[0].shop_id
          console.log(`Found user's first store: ${firstStoreId}`)
          
          // İlk mağazanın ürünlerini getir
          const { listings, count } = await getEtsyListings(user.id, firstStoreId, limit, offset, state, skipCache)
          console.log(`Retrieved ${listings.length} listings from a total of ${count}`)
          
          return NextResponse.json({
            listings,
            count,
            page,
            limit,
            total_pages: Math.ceil(count / limit),
            shop_id: firstStoreId
          })
        } else {
          console.log("No stores found for user")
          return NextResponse.json({ 
            error: "No stores found", 
            listings: [], 
            count: 0 
          }, { status: 404 })
        }
      } catch (error) {
        console.error("Error getting user's stores:", error)
        return NextResponse.json({ 
          error: "Failed to find user's stores", 
          listings: [], 
          count: 0 
        }, { status: 500 })
      }
    }

    // shop_id'yi sayıya dönüştür
    const shop_id = parseInt(shop_id_param)
    
    if (isNaN(shop_id) || shop_id <= 0) {
      console.log("Invalid shop_id (not a valid number):", shop_id_param)
      return NextResponse.json({ 
        error: "Invalid shop_id", 
        listings: [], 
        count: 0 
      }, { status: 400 })
    }

    // Etsy'den ürünleri çek
    console.log(`Fetching listings for user ${user.id}, shop ${shop_id}, page ${page}, limit ${limit}, state ${state}`)
    const { listings, count } = await getEtsyListings(user.id, shop_id, limit, offset, state, skipCache)
    console.log(`Retrieved ${listings.length} listings from a total of ${count}`)

    // Sonuçları döndür
    return NextResponse.json({
      listings,
      count,
      page,
      limit,
      total_pages: Math.ceil(count / limit),
      shop_id: shop_id
    })
  } catch (error) {
    console.error("Error in listings API:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error instanceof Error ? error.message : "Unknown error",
      listings: [], 
      count: 0 
    }, { status: 500 })
  }
} 