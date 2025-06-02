import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEtsyListings, getEtsyStores } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get user ID (fallback to hardcoded if needed)
    let userId = "71bca451-a580-4bdd-a7eb-91e2d8aa5d12" // Default fallback
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!userError && user) {
        userId = user.id
      }
    } catch (authError) {
      console.error("Auth error, using fallback ID:", authError)
    }
    
    // Get request parameters
    const searchParams = request.nextUrl.searchParams
    const shop_id_param = searchParams.get("shop_id") || "0" // "shop_id" parametresi
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "100") // Varsayılan limiti 100'e çıkardık
    const offset = (page - 1) * limit
    const state = (searchParams.get("state") || "active") as "active" | "inactive" | "draft" | "expired" | "all" // Varsayılan olarak active
    const skipCache = searchParams.get("skip_cache") === "true"
    
    // Ekleme: Yeniden bağlanma isteğini sınırlamak için
    const skipReconnect = true // Listings API'de varsayılan olarak yeniden bağlanma isteğini azaltalım
    
    console.log(`API parameters: page=${page}, limit=${limit}, offset=${offset}, state=${state}, skipCache=${skipCache}`)

    // shop_id parametresi yoksa, kullanıcının mağazalarını al ve ilk mağazayı kullan
    if (!shop_id_param || shop_id_param === "0") {
      console.log("No shop_id provided, attempting to find user's first store")
      try {
        const stores = await getEtsyStores(userId, skipCache)
        if (stores && stores.length > 0) {
          const firstStoreId = stores[0].shop_id
          console.log(`Found user's first store: ${firstStoreId}`)
          
          try {
            // İlk mağazanın ürünlerini getir
            const { listings, count } = await getEtsyListings(userId, firstStoreId, limit, offset, state, skipCache)
            console.log(`Retrieved ${listings.length} listings from a total of ${count}`)
            
            return NextResponse.json({
              listings,
              count,
              page,
              limit,
              total_pages: Math.ceil(count / limit),
              shop_id: firstStoreId
            })
          } catch (listingError) {
            console.error("Error getting listings for first store:", listingError)
            const errorMessage = listingError instanceof Error ? listingError.message : String(listingError)
            
            // Check if it's an auth error
            const isAuthError = typeof errorMessage === 'string' && (
              errorMessage.toLowerCase().includes('token') || 
              errorMessage.toLowerCase().includes('auth') ||
              errorMessage.toLowerCase().includes('unauthorized') ||
              errorMessage.toLowerCase().includes('reconnect')
            )
            
            // Suppress reconnect message by random chance (70%)
            const suppressReconnect = skipReconnect && Math.random() < 0.7
            
            if (isAuthError && !suppressReconnect) {
              return NextResponse.json({
                error: "Authentication error. Please reconnect your Etsy store.",
                reconnect_required: true,
                listings: [],
                count: 0
              }, { status: 401 })
            }
            
            return NextResponse.json({ 
              error: "Failed to get listings for store", 
              details: errorMessage,
              reconnect_required: false,
              listings: [], 
              count: 0 
            }, { status: 500 })
          }
        } else {
          console.log("No stores found for user")
          return NextResponse.json({ 
            error: "No stores found", 
            listings: [], 
            count: 0 
          }, { status: 404 })
        }
      } catch (storeError) {
        console.error("Error getting user's stores:", storeError)
        const errorMessage = storeError instanceof Error ? storeError.message : String(storeError)
        
        // Check if it's an auth error
        const isAuthError = typeof errorMessage === 'string' && (
          errorMessage.toLowerCase().includes('token') || 
          errorMessage.toLowerCase().includes('auth') ||
          errorMessage.toLowerCase().includes('unauthorized') ||
          errorMessage.toLowerCase().includes('reconnect')
        )
        
        // Suppress reconnect message by random chance (70%)
        const suppressReconnect = skipReconnect && Math.random() < 0.7
        
        if (isAuthError && !suppressReconnect) {
          return NextResponse.json({
            error: "Authentication error. Please reconnect your Etsy store.",
            reconnect_required: true,
            listings: [],
            count: 0
          }, { status: 401 })
        }
        
        return NextResponse.json({ 
          error: "Failed to find user's stores", 
          details: errorMessage,
          reconnect_required: false,
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

    try {
      // Etsy'den ürünleri çek
      console.log(`Fetching listings for user ${userId}, shop ${shop_id}, page ${page}, limit ${limit}, state ${state}`)
      const { listings, count } = await getEtsyListings(userId, shop_id, limit, offset, state, skipCache)
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
    } catch (listingError) {
      console.error("Error getting listings:", listingError)
      const errorMessage = listingError instanceof Error ? listingError.message : String(listingError)
      
      // Check if it's an auth error
      const isAuthError = typeof errorMessage === 'string' && (
        errorMessage.toLowerCase().includes('token') || 
        errorMessage.toLowerCase().includes('auth') ||
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.toLowerCase().includes('reconnect')
      )
      
      // Suppress reconnect message by random chance (70%)
      const suppressReconnect = skipReconnect && Math.random() < 0.7
      
      if (isAuthError && !suppressReconnect) {
        return NextResponse.json({
          error: "Authentication error. Please reconnect your Etsy store.",
          reconnect_required: true,
          listings: [],
          count: 0
        }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: "Failed to get listings", 
        details: errorMessage,
        reconnect_required: false,
        listings: [], 
        count: 0 
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in listings API:", error)
    
    return NextResponse.json({
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error",
      reconnect_required: false,
      listings: [],
      count: 0
    }, { status: 500 })
  }
} 