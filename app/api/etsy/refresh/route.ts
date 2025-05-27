import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEtsyDataWithRefreshControl, invalidateUserCache, getEtsyStores } from "@/lib/etsy-api"

/**
 * Etsy API verilerini yenileyen endpoint
 * Bu endpoint, önbellek verilerini temizleyip yeni veri çeker
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    console.log("Creating server-side Supabase client with URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
    
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
    
    // Get request parameters - parse JSON body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.warn("Error parsing JSON body, using empty object:", parseError);
      body = {};
    }
    
    const shopId = body.shop_id ? parseInt(body.shop_id) : undefined
    const forceRefresh = body.force_refresh === true

    console.log(`Refreshing cache for user ${userId} and shop ${shopId || 'all shops'}. Force clear: ${forceRefresh}`)

    // First, always invalidate the cache to ensure fresh data
    try {
      if (shopId) {
        // Import to avoid circular dependency
        const { invalidateShopCache } = await import('@/lib/etsy-api')
        invalidateShopCache(userId, shopId)
        console.log(`Invalidated cache for shop: ${shopId}`)
      } else {
        // Invalidate all user caches
        invalidateUserCache(userId)
        console.log(`Invalidated cache for user: ${userId}`)
      }
    } catch (cacheError) {
      console.error("Error invalidating cache:", cacheError)
    }

    // If forcing a refresh, first check if the token is valid by getting stores
    if (forceRefresh) {
      try {
        // Try to get stores with a forced refresh to validate token
        const stores = await getEtsyStores(userId, true)
        
        if (!stores || stores.length === 0) {
          return NextResponse.json({
            success: false,
            message: "No Etsy stores found or token invalid. Reconnection may be required.",
            reconnect_required: true,
            timestamp: Date.now()
          })
        }
        
        console.log(`Found ${stores.length} valid Etsy stores - token is working`)
        
        // Continue with refresh using getEtsyDataWithRefreshControl
      } catch (storeError) {
        console.error("Error checking stores during refresh:", storeError)
        const message = storeError instanceof Error ? storeError.message : "Unknown error"
        
        // Check if it's a token error
        const isAuthError = typeof message === 'string' && (
          message.includes("Invalid API key") || 
          message.includes("invalid_token") ||
          message.includes("RECONNECT_REQUIRED") ||
          message.includes("unauthorized")
        )
        
        if (isAuthError) {
          return NextResponse.json({
            success: false,
            message: "Etsy authentication failed. Please reconnect your store.",
            reconnect_required: true,
            timestamp: Date.now()
          })
        }
        
        return NextResponse.json({
          success: false,
          message: `Error refreshing data: ${message}`,
          timestamp: Date.now()
        })
      }
    }

    // Get Etsy data with refresh control
    const result = await getEtsyDataWithRefreshControl(userId, shopId, forceRefresh)

    return NextResponse.json({
      ...result,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error("Error in refresh API:", error)
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now()
    }, { status: 500 })
  }
} 