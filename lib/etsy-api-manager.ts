import { createClient } from "@/lib/supabase/server";
import { fetchWithCache } from "@/lib/api-utils";

export class EtsyApiManager {
  private static instance: EtsyApiManager;
  private tokenCache: Map<string, { accessToken: string; expires: number }> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map();
  private rateLimits: Map<string, { remaining: number; resetTime: number }> = new Map();

  private constructor() {}

  public static getInstance(): EtsyApiManager {
    if (!EtsyApiManager.instance) {
      EtsyApiManager.instance = new EtsyApiManager();
    }
    return EtsyApiManager.instance;
  }

  /**
   * Belirli bir kullanıcı ve mağaza için geçerli bir Etsy access token'ı alır.
   */
  public async getValidAccessToken(userId: string, shopId?: number): Promise<string> {
    const cacheKey = shopId ? `${userId}:${shopId}` : userId;
    
    // Cache'ten kontrol et
    const cachedToken = this.tokenCache.get(cacheKey);
    if (cachedToken && cachedToken.expires > Date.now()) {
      return cachedToken.accessToken;
    }

    try {
      // Veritabanından token bilgilerini al
      const supabase = await createClient();
      const query = supabase
        .from("etsy_tokens")
        .select("id, access_token, refresh_token, expires_at, is_valid")
        .eq("user_id", userId);
      
      if (shopId) {
        query.eq("shop_id", shopId);
      }
      
      const { data, error } = await query.single();

      if (error) {
        throw new Error(`Token alınamadı: ${error.message}`);
      }

      if (!data || !data.is_valid) {
        throw new Error("Etsy bağlantısı bulunamadı veya geçersiz. Lütfen mağazanızı bağlayın.");
      }

      const expiresAt = new Date(data.expires_at).getTime();

      // Token süresi dolmuşsa yenile
      if (expiresAt <= Date.now() + 60000) { // 1 dakika emniyet payı
        return await this.refreshToken(userId, data.refresh_token, shopId);
      }

      // Cache'e ekle ve döndür
      this.tokenCache.set(cacheKey, {
        accessToken: data.access_token,
        expires: expiresAt
      });

      return data.access_token;
    } catch (error) {
      console.error("Token alma hatası:", error);
      throw error;
    }
  }

  /**
   * Etsy refresh token'ı kullanarak yeni bir access token alır.
   */
  private async refreshToken(userId: string, refreshToken: string, shopId?: number): Promise<string> {
    try {
      const response = await fetch("https://api.etsy.com/v3/public/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: process.env.ETSY_CLIENT_ID as string,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        // Token yenileme başarısız olursa, veritabanından sil
        await this.invalidateToken(userId, shopId);
        throw new Error("Token yenilenemedi. Etsy bağlantınızı yenilemeniz gerekiyor.");
      }

      const data = await response.json() as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
      
      // Yeni token'ı veritabanına kaydet
      const supabase = await createClient();
      const updateData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        last_refreshed_at: new Date().toISOString(),
        is_valid: true
      };

      const query = supabase
        .from("etsy_tokens")
        .update(updateData)
        .eq("user_id", userId);
      
      if (shopId) {
        query.eq("shop_id", shopId);
      }

      const { error } = await query;

      if (error) {
        console.error("Token güncelleme hatası:", error);
      }

      // Cache'e ekle
      const cacheKey = shopId ? `${userId}:${shopId}` : userId;
      this.tokenCache.set(cacheKey, {
        accessToken: data.access_token,
        expires: Date.now() + data.expires_in * 1000
      });

      return data.access_token;
    } catch (error) {
      console.error("Token yenileme hatası:", error);
      throw error;
    }
  }

  /**
   * Token'ı geçersiz kılar
   */
  public async invalidateToken(userId: string, shopId?: number): Promise<void> {
    const supabase = await createClient();
    const query = supabase
      .from("etsy_tokens")
      .update({ is_valid: false })
      .eq("user_id", userId);
    
    if (shopId) {
      query.eq("shop_id", shopId);
    }

    await query;
    
    // Cache'den kaldır
    const cacheKey = shopId ? `${userId}:${shopId}` : userId;
    this.tokenCache.delete(cacheKey);
  }

  /**
   * Etsy API'sine istek gönderir
   */
  public async makeRequest<T>(
    endpoint: string,
    userId: string,
    options: RequestInit = {},
    shopId?: number
  ): Promise<T> {
    const accessToken = await this.getValidAccessToken(userId, shopId);
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": process.env.ETSY_CLIENT_ID as string,
    };

    const response = await fetch(`https://api.etsy.com/v3${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Etsy API hatası: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Rate limit kontrolü yapar
   */
  private checkRateLimit(endpoint: string): boolean {
    const limit = this.rateLimits.get(endpoint);
    if (!limit) return true;

    if (limit.remaining <= 0 && Date.now() < limit.resetTime) {
      return false;
    }

    return true;
  }

  /**
   * Rate limit bilgilerini günceller
   */
  private updateRateLimit(endpoint: string, remaining: number, resetTime: number): void {
    this.rateLimits.set(endpoint, { remaining, resetTime });
  }

  /**
   * Etsy API'ye istek gönderir ve rate limit'i yönetir.
   */
  public async makeApiRequest(
    userId: string, 
    endpoint: string, 
    options: RequestInit = {}, 
    cacheKey?: string,
    skipCache = false
  ): Promise<any> {
    // Aynı endpoint için çoklu istekleri engelle
    const requestId = `${userId}:${endpoint}`;
    if (this.requestQueue.has(requestId)) {
      return this.requestQueue.get(requestId);
    }

    // Rate limit kontrolü
    const rateLimit = this.rateLimits.get(endpoint);
    if (rateLimit && rateLimit.remaining <= 3 && rateLimit.resetTime > Date.now()) {
      const waitTime = rateLimit.resetTime - Date.now();
      console.log(`Rate limit aşıldı. ${waitTime}ms bekleniyor...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    try {
      // Access token al
      const accessToken = await this.getValidAccessToken(userId);
      
      // Headers'ı hazırla
      const headers = new Headers(options.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      headers.set("x-api-key", process.env.ETSY_CLIENT_ID as string);
      
      // İsteği yap
      const requestPromise = fetchWithCache(
        `https://openapi.etsy.com/v3${endpoint}`,
        {
          ...options,
          headers,
        },
        cacheKey,
        skipCache ? 0 : undefined
      ).then((response) => {
        // Rate limit bilgisini güncelle
        const remaining = parseInt(response.headers.get("x-ratelimit-remaining") || "100");
        const resetTime = parseInt(response.headers.get("x-ratelimit-reset") || "0") * 1000;
        
        this.rateLimits.set(endpoint, {
          remaining,
          resetTime: Date.now() + resetTime
        });
        
        // İsteği kuyruktan kaldır
        this.requestQueue.delete(requestId);
        
        return response;
      });
      
      // İsteği kuyruğa ekle
      this.requestQueue.set(requestId, requestPromise);
      
      return await requestPromise;
    } catch (error) {
      // İsteği kuyruktan kaldır
      this.requestQueue.delete(requestId);
      
      // Token hatası varsa otomatik olarak geçersiz kıl
      if (error.message?.includes("invalid_token") || error.message?.includes("401")) {
        await this.invalidateToken(userId);
        throw new Error("Etsy hesabınızın yetkilendirmesi sona ermiş. Lütfen yeniden bağlanın.");
      }
      
      throw error;
    }
  }

  /**
   * Kullanıcının tüm Etsy mağazalarını getirir.
   */
  public async getUserStores(userId: string, skipCache = false): Promise<any[]> {
    try {
      const data = await this.makeApiRequest(
        userId,
        "/application/shops",
        {},
        `etsy_stores_${userId}`,
        skipCache
      );
      
      return data.results || [];
    } catch (error) {
      console.error("Mağaza bilgileri alınamadı:", error);
      
      // Veritabanında kaydedilmiş mağazaları kontrol et
      try {
        const supabase = await createClient();
        const { data } = await supabase
          .from("etsy_stores")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true);
        
        if (data && data.length > 0) {
          return data;
        }
      } catch (dbError) {
        console.error("Veritabanı hatası:", dbError);
      }
      
      throw error;
    }
  }

  /**
   * Belirli bir mağazanın aktif ürünlerini getirir.
   */
  public async getShopListings(
    userId: string, 
    shopId: number, 
    state: 'active' | 'inactive' | 'draft' | 'expired' | 'all' = 'active',
    limit = 100,
    offset = 0,
    skipCache = false
  ): Promise<any> {
    const stateParam = state === 'all' ? '' : `&state=${state}`;
    const endpoint = `/application/shops/${shopId}/listings?limit=${limit}&offset=${offset}${stateParam}&includes=Images`;
    
    try {
      return await this.makeApiRequest(
        userId,
        endpoint,
        {},
        `etsy_listings_${shopId}_${state}_${limit}_${offset}`,
        skipCache
      );
    } catch (error) {
      console.error(`Ürün listesi alınamadı (${shopId}):`, error);
      throw error;
    }
  }
  
  /**
   * Belirli bir kullanıcı için tüm mağazalardaki verileri temizler.
   */
  public async cleanupUserData(userId: string): Promise<void> {
    try {
      // Token'ı temizle
      await this.invalidateToken(userId);
      
      // Cache'ten ilgili verileri temizle
      for (const key of this.tokenCache.keys()) {
        if (key.startsWith(userId)) {
          this.tokenCache.delete(key);
        }
      }
      
      console.log(`${userId} kullanıcısı için veriler temizlendi.`);
    } catch (error) {
      console.error("Veri temizleme hatası:", error);
      throw error;
    }
  }
}

export default EtsyApiManager; 