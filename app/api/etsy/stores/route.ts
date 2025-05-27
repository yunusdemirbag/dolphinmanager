import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEtsyStores, getStoresFromDatabase } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log("Stores API auth error:", userError ? userError.message : "No user found");
      return NextResponse.json({ error: "Unauthorized", stores: [], connected: false }, { status: 401 })
    }

    // API isteği parametreleri
    const skipCache = request.headers.get('X-Skip-Cache') === 'true';
    console.log(`Fetching Etsy stores for user: ${user.id}, Skip cache: ${skipCache}`);

    try {
      // Token yoksa ya da geçersizse, bağlantı yok
      const { data: tokenData, error: tokenError } = await supabase
        .from("etsy_tokens")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (tokenError) {
        console.error("Error fetching tokens:", tokenError);
        return NextResponse.json({ 
          error: "DATABASE_ERROR",
          message: "Veritabanından token bilgisi alınamadı",
          stores: [],
          connected: false,
          source: "database_error" 
        }, { status: 500 });
      }
      
      const hasValidToken = !!tokenData && tokenData.length > 0;
      const now = new Date();
      const expires = hasValidToken ? new Date(tokenData[0].expires_at) : null;
      const isExpired = expires ? now > expires : true;
      
      console.log("User has valid Etsy token:", hasValidToken, {
        expires_at: expires ? expires.toISOString() : 'N/A',
        created_at: hasValidToken ? tokenData[0].created_at : 'N/A',
        token_length: hasValidToken ? tokenData[0].access_token.length : 0
      });
      
      // Etsy API'den mağazaları çekmeye çalış
      if (hasValidToken && !isExpired) {
        try {
          // Etsy mağazalarını çek
          const etsyStores = await getEtsyStores(user.id, skipCache);
          console.log(`getEtsyStores returned ${etsyStores ? etsyStores.length : 0} stores`);
          
          // getEtsyStores'dan gelen yanıtı detaylı logla
          if (etsyStores && etsyStores.length > 0) {
            console.log("First store raw data:", JSON.stringify(etsyStores[0], null, 2));
          } else {
            console.log("No stores returned from getEtsyStores");
          }

          // Mağaza verisi var mı kontrol et
          if (etsyStores && etsyStores.length > 0) {
            console.log("✅ Etsy stores found:", etsyStores.length, "stores");
            
            // Debug: Mağaza bilgilerini log'la
            console.log("First store details:", {
              shop_id: etsyStores[0].shop_id,
              shop_name: etsyStores[0].shop_name,
              type_shop_id: typeof etsyStores[0].shop_id
            });
            
            // Mağaza verilerini düzenle ve döndür
            const storeData = etsyStores.map(store => ({
              shop_id: store.shop_id,
              shop_name: store.shop_name,
              title: store.title || store.shop_name,
              listing_active_count: store.listing_active_count || 0,
              num_favorers: store.num_favorers || 0,
              is_active: typeof store.is_active === 'boolean' ? store.is_active : true,
              review_average: store.review_average || 0,
              review_count: store.review_count || 0,
              currency_code: store.currency_code || "USD",
              url: store.url || `https://www.etsy.com/shop/${store.shop_name}`,
              last_synced_at: store.last_synced_at || new Date().toISOString(),
              avatar_url: store.avatar_url || null
            }));
            
            return NextResponse.json({
              stores: storeData,
              count: storeData.length,
              connected: true,
              source: "api" 
            });
          } else {
            // Mağaza bulunamadı
            console.log("No Etsy stores found for user after API and DB checks");
            
            // Token varsa bağlı ama mağaza yok, yoksa bağlı değil
            if (hasValidToken) {
              console.log("User has Etsy tokens, but no shops found. Informing client.");
              
              // Token expired?
              if (isExpired) {
                console.log("Token is expired. User needs to reconnect.");
                return NextResponse.json({
                  error: "RECONNECT_REQUIRED",
                  message: "Etsy bağlantınızın süresi dolmuş. Lütfen yeniden bağlanın.",
                  stores: [],
                  connected: false,
                  source: "token_expired"
                });
              }
              
              // Token son kullanma tarihi yaklaşıyorsa otomatik yenilemeyi dene
              const timeUntilExpiry = expires ? expires.getTime() - now.getTime() : -1;
              if (tokenData && timeUntilExpiry > 0 && timeUntilExpiry < 24 * 60 * 60 * 1000) { // 24 saatten az kaldıysa
                console.log(`Token will expire soon (${Math.round(timeUntilExpiry / (60 * 60 * 1000))} hours left). Attempting refresh...`);
                
                try {
                  // Yenileme API'sini çağır
                  const refreshResponse = await fetch('/api/etsy/refresh-token', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId: user.id }),
                  });
                  
                  if (refreshResponse.ok) {
                    console.log("Token refreshed successfully");
                    // Başarılı yenileme durumunda normal yanıt ver, yeniden bağlantı gerekmez
                  } else {
                    console.log("Token refresh failed, will notify client to reconnect");
                    return NextResponse.json({
                      error: "TOKEN_REFRESH_FAILED",
                      stores: [],
                      count: 0,
                      connected: false,
                      message: "Token yenilemesi başarısız oldu. Lütfen Etsy hesabınıza yeniden bağlanın.",
                      source: "token_refresh_failed"
                    });
                  }
                } catch (refreshError) {
                  console.error("Error refreshing token:", refreshError);
                }
              }
              
              return NextResponse.json({ 
                stores: [], 
                count: 0, 
                connected: true,
                message: "Etsy hesabınızda herhangi bir mağaza bulunamadı. Lütfen Etsy'de bir mağaza oluşturun.",
                source: "no_shops_found_with_active_connection"
              });
            }
          }
        } catch (error: any) {
          console.error("Error fetching from Etsy API:", error);
          
          // Check if this is a token error that requires reconnection
          if (error.message && (
              error.message.includes('RECONNECT_REQUIRED') || 
              error.message.includes('invalid_grant') || 
              error.message.includes('invalid_token')
            )) {
            console.log("Token error detected, reconnection required");
            return NextResponse.json({
              error: "RECONNECT_REQUIRED",
              message: "Etsy bağlantınız geçersiz olmuş. Lütfen yeniden bağlanın.",
              stores: [],
              connected: false,
              source: "token_error" 
            });
          }
          
          // Fall back to database in case of other API errors
          const dbStores = await getStoresFromDatabase(user.id);
          
          if (dbStores && dbStores.length > 0) {
            console.log("Using database fallback for stores:", dbStores.length);
            return NextResponse.json({
              stores: dbStores,
              count: dbStores.length,
              connected: true,
              source: "database_fallback"
            });
          }
          
          // If still no stores, return the API error
          return NextResponse.json({
            error: "ETSY_API_ERROR",
            message: error.message || "Etsy API'ye erişilemiyor",
            stores: [],
            connected: hasValidToken,
            source: "api_error" 
          });
        }
      } else {
        // Mağaza bulunamadı
        console.log("No Etsy stores found for user after API and DB checks");
        
        // Token varsa bağlı ama mağaza yok, yoksa bağlı değil
        if (hasValidToken) {
          console.log("User has Etsy tokens, but no shops found. Informing client.");
          
          // Token expired?
          if (isExpired) {
            console.log("Token is expired. User needs to reconnect.");
            return NextResponse.json({
              error: "RECONNECT_REQUIRED",
              message: "Etsy bağlantınızın süresi dolmuş. Lütfen yeniden bağlanın.",
              stores: [],
              connected: false,
              source: "token_expired"
            });
          }
          
          // Token son kullanma tarihi yaklaşıyorsa otomatik yenilemeyi dene
          const timeUntilExpiry = expires ? expires.getTime() - now.getTime() : -1;
          if (tokenData && timeUntilExpiry > 0 && timeUntilExpiry < 24 * 60 * 60 * 1000) { // 24 saatten az kaldıysa
            console.log(`Token will expire soon (${Math.round(timeUntilExpiry / (60 * 60 * 1000))} hours left). Attempting refresh...`);
            
            try {
              // Yenileme API'sini çağır
              const refreshResponse = await fetch('/api/etsy/refresh-token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: user.id }),
              });
              
              if (refreshResponse.ok) {
                console.log("Token refreshed successfully");
                // Başarılı yenileme durumunda normal yanıt ver, yeniden bağlantı gerekmez
              } else {
                console.log("Token refresh failed, will notify client to reconnect");
                return NextResponse.json({
                  error: "TOKEN_REFRESH_FAILED",
                  stores: [],
                  count: 0,
                  connected: false,
                  message: "Token yenilemesi başarısız oldu. Lütfen Etsy hesabınıza yeniden bağlanın.",
                  source: "token_refresh_failed"
                });
              }
            } catch (refreshError) {
              console.error("Error refreshing token:", refreshError);
            }
          }
          
          return NextResponse.json({ 
            stores: [], 
            count: 0, 
            connected: true,
            message: "Etsy hesabınızda herhangi bir mağaza bulunamadı. Lütfen Etsy'de bir mağaza oluşturun.",
            source: "no_shops_found_with_active_connection"
          });
        } else {
          console.log("User has no valid Etsy tokens. Reconnect required.");
          return NextResponse.json({
            error: "RECONNECT_REQUIRED",
            stores: [],
            count: 0,
            connected: false,
            message: "Etsy hesabınıza yeniden bağlanmanız gerekiyor.",
            source: "no_etsy_connection"
          });
        }
      }
    } catch (etsyError) {
      console.error("Error fetching Etsy stores:", etsyError);
      // Etsy API hatası
      return NextResponse.json({
        error: "ETSY_API_ERROR",
        message: etsyError instanceof Error ? etsyError.message : "Etsy API ile iletişimde bir sorun oluştu.",
        stores: [],
        connected: false,
        source: "etsy_api_error"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in stores API:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      stores: [], 
      count: 0, 
      connected: false,
      message: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu."
    }, { status: 500 });
  }
} 