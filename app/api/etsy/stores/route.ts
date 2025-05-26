import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEtsyStores } from "@/lib/etsy-api"

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
      // Etsy mağazalarını çek
      const etsyStores = await getEtsyStores(user.id, skipCache);
      console.log(`getEtsyStores returned ${etsyStores ? etsyStores.length : 0} stores`);
      
      // getEtsyStores'dan gelen yanıtı detaylı logla
      if (etsyStores && etsyStores.length > 0) {
        console.log("First store raw data:", JSON.stringify(etsyStores[0], null, 2));
      } else {
        console.log("No stores returned from getEtsyStores");
      }

      // Token var mı kontrol et - bağlantı durumunu belirlemek için
      const { data: tokenData, error: tokenError } = await supabase
        .from("etsy_tokens")
        .select("expires_at, created_at, access_token")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
      if (tokenError) {
        console.log("Token query error:", tokenError.message);
      }

      const hasValidToken = tokenData && tokenData.access_token && tokenData.expires_at && new Date(tokenData.expires_at) > new Date();
      console.log(`User has valid Etsy token: ${hasValidToken}`, tokenData ? {
        expires_at: tokenData.expires_at,
        created_at: tokenData.created_at,
        token_length: tokenData.access_token ? tokenData.access_token.length : 0
      } : "No token data");

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