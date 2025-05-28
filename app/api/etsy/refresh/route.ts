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
    const skipReconnect = body.skip_reconnect === true // Yeni: Yeniden bağlanma isteğini atlama seçeneği
    const manualReconnect = body.manual_reconnect === true // Yeni: Kullanıcının manuel bağlanma isteği
    
    console.log(`Refreshing cache for user ${userId} and shop ${shopId || 'all shops'}. Force clear: ${forceRefresh}, Skip reconnect: ${skipReconnect}, Manual: ${manualReconnect}`)

    // Önce token'ın durumunu kontrol edelim
    // Eğer token yoksa veya süresi dolmuşsa ve kullanıcı manuel bağlanma isteği yapmıyorsa, mevcut token'ı korumaya çalışalım
    if (!manualReconnect) {
      try {
        // Tokenları kontrol et
        const { data: tokenData, error: tokenError } = await supabase
          .from("etsy_tokens")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);
          
        if (!tokenError && tokenData && tokenData.length > 0) {
          // Token var, kullanılabilir durumda mı kontrol et
          const token = tokenData[0];
          const expiresAt = new Date(token.expires_at).getTime();
          const now = Date.now();
          
          // Token süresi dolmadıysa ve kullanıcı manuel refresh istemiyorsa, mevcut token'ı kullan
          // 1 saat içinde dolacak bile olsa, sadece önbelleği temizle ve devam et
          if (expiresAt > now && !forceRefresh) {
            console.log("Token still valid, skipping reconnect and just clearing cache");
            
            // Sadece önbelleği temizle
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
            
            return NextResponse.json({
              success: true,
              message: "Using existing valid token, cache cleared.",
              reconnect_required: false,
              timestamp: Date.now()
            });
          }
        }
      } catch (tokenCheckError) {
        console.error("Error checking token status:", tokenCheckError);
        // Devam et - bu kritik bir hata değil
      }
    }

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

    // Daha az sıklıkla reconnect isteği için
    // Eğer skipReconnect true ise ve önemli bir hata yoksa reconnect_required = false döndür
    const shouldSkipReconnect = skipReconnect && Math.random() < 0.8; // %80 olasılıkla yeniden bağlanma isteğini atla
    
    // Kullanıcının manuel reconnect isteyip istemediğini kontrol et
    if (manualReconnect) {
      console.log("Manual reconnect requested, forcing token check");
      // Kullanıcı manuel olarak bağlanmak istiyor, shouldSkipReconnect'i devre dışı bırak
      // ve kullanıcıya anında yeni bağlanma URL'si dön
      
      // Mevcut tokenleri temizle
      try {
        const { error: deleteError } = await supabase
          .from("etsy_tokens")
          .delete()
          .eq("user_id", userId);
          
        if (deleteError) {
          console.error("Error deleting tokens for manual reconnect:", deleteError);
        }
      } catch (deleteError) {
        console.error("Exception deleting tokens:", deleteError);
      }
      
      return NextResponse.json({
        success: false,
        message: "Manual reconnect requested. Please reconnect your Etsy store.",
        reconnect_required: true,
        timestamp: Date.now()
      });
    }

    // If forcing a refresh, first check if the token is valid by getting stores
    if (forceRefresh) {
      try {
        // Try to get stores with a forced refresh to validate token
        const stores = await getEtsyStores(userId, true)
        
        if (!stores || stores.length === 0) {
          if (shouldSkipReconnect) {
            // Yeniden bağlanma isteğini atla ama uyarı ver
            console.log("Skipping reconnect request despite no stores found (throttling to reduce frequency)");
            return NextResponse.json({
              success: true,
              message: "No stores found but continuing operation.",
              reconnect_required: false,
              timestamp: Date.now()
            });
          }
          
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
          if (shouldSkipReconnect) {
            // Yeniden bağlanma isteğini atla ama uyarı ver
            console.log("Skipping reconnect request despite auth error (throttling to reduce frequency)");
            return NextResponse.json({
              success: true,
              message: "Auth issues detected but continuing operation.",
              reconnect_required: false,
              timestamp: Date.now()
            });
          }
          
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
    try {
      const result = await getEtsyDataWithRefreshControl(userId, shopId, forceRefresh)

      return NextResponse.json({
        ...result,
        timestamp: Date.now()
      })
    } catch (apiError) {
      console.error("Error getting Etsy data:", apiError);
      const message = apiError instanceof Error ? apiError.message : "Unknown error";
      
      // Check if it's a token error
      const isAuthError = typeof message === 'string' && (
        message.includes("Invalid API key") || 
        message.includes("invalid_token") ||
        message.includes("RECONNECT_REQUIRED") ||
        message.includes("unauthorized")
      )
      
      if (isAuthError && shouldSkipReconnect) {
        // Yeniden bağlanma isteğini atla ama uyarı ver
        console.log("Skipping reconnect request despite auth error (throttling to reduce frequency)");
        return NextResponse.json({
          success: true,
          message: "Auth issues detected but continuing operation.",
          reconnect_required: false,
          timestamp: Date.now()
        });
      }
      
      return NextResponse.json({
        success: false,
        message: `Error refreshing data: ${message}`,
        reconnect_required: isAuthError && !shouldSkipReconnect,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error("Error in refresh API:", error)
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      reconnect_required: false, // Genel hatalar için yeniden bağlanma istemeyelim
      timestamp: Date.now()
    }, { status: 500 })
  }
} 