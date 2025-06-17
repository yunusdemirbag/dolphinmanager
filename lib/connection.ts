import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Önbellek için tip tanımlamaları
interface EtsyToken {
  expires_at: string;
  created_at: string;
  access_token_length: number;
  access_token_prefix: string;
  token_type: string;
  access_token?: string;
}

interface EtsyStore {
  shop_id: number;
  shop_name: string;
  user_id: number;
  title: string;
  [key: string]: any;
}

interface ConnectionCache {
  supabaseClient: any;
  token: EtsyToken | null;
  userId: string | null;
  etsyUserId: string | null;
  stores: EtsyStore[] | null;
  lastFetched: number;
}

// Önbellek nesnesi
let connectionCache: ConnectionCache | null = null;
const CACHE_TTL = 1000 * 60 * 5; // 5 dakika önbellek süresi

// Token'ın geçerli olup olmadığını kontrol eden yardımcı fonksiyon
function isTokenExpired(token: EtsyToken): boolean {
  if (!token || !token.expires_at) return true;
  const expiryDate = new Date(token.expires_at);
  return expiryDate <= new Date();
}

// Bağlantı bilgilerini döndüren ana fonksiyon
export async function getConnection(userId: string, forceRefresh = false) {
  console.log("🔄 getConnection çağrıldı");
  
  // Önbellek geçerliyse ve yenileme zorlanmıyorsa önbellekten döndür
  if (
    connectionCache && 
    connectionCache.userId === userId && 
    connectionCache.token && 
    !isTokenExpired(connectionCache.token) &&
    Date.now() - connectionCache.lastFetched < CACHE_TTL &&
    !forceRefresh
  ) {
    console.log("✅ Önbellekten bağlantı bilgileri kullanılıyor");
    return connectionCache;
  }

  console.log("🔄 Bağlantı bilgileri yenileniyor...");
  
  // Supabase client oluştur
  const supabase = await createClient();
  
  // Token bilgisini al
  const { data: tokenData } = await supabase
    .from("etsy_tokens")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const token = tokenData || null;
  
  // Etsy User ID'yi al
  let etsyUserId = null;
  let stores = null;
  
  if (token && !isTokenExpired(token)) {
    try {
      // Etsy User ID'yi al
      const userResponse = await fetch("https://openapi.etsy.com/v3/application/users/me", {
        headers: {
          "Authorization": `Bearer ${token.access_token}`,
          "x-api-key": process.env.ETSY_API_KEY || "",
        },
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        etsyUserId = userData.user_id;
        
        // Dükkan bilgilerini al
        const shopsResponse = await fetch(`https://openapi.etsy.com/v3/application/users/${etsyUserId}/shops`, {
          headers: {
            "Authorization": `Bearer ${token.access_token}`,
            "x-api-key": process.env.ETSY_API_KEY || "",
          },
        });
        
        if (shopsResponse.ok) {
          const shopsData = await shopsResponse.json();
          stores = Array.isArray(shopsData.results) ? shopsData.results : [shopsData];
        }
      }
    } catch (error) {
      console.error("Etsy API'ye erişim hatası:", error);
    }
  }
  
  // Önbelleği güncelle
  connectionCache = {
    supabaseClient: supabase,
    token,
    userId,
    etsyUserId,
    stores,
    lastFetched: Date.now()
  };
  
  return connectionCache;
}

// Önbelleği temizleme fonksiyonu
export function clearConnectionCache() {
  connectionCache = null;
  console.log("🧹 Bağlantı önbelleği temizlendi");
} 