import crypto from "crypto"
import qs from "querystring"
import { v4 as uuidv4 } from "uuid";
import { cacheManager } from "./cache"
import { fetchWithCache } from "./api-utils"
import { Database } from "@/types/database.types";
import { cookies } from "next/headers";
import { auth, db } from '@/lib/firebase/admin';

// Etsy'nin kabul ettiği geçerli renk kodları
export const ETSY_VALID_COLORS = [
  'beige',
  'black', 
  'blue',
  'brown',
  'clear',
  'copper',
  'gold',
  'gray',
  'green',
  'orange',
  'pink',
  'purple',
  'red',
  'silver',
  'white',
  'yellow'
] as const;

export type EtsyColor = typeof ETSY_VALID_COLORS[number];

// Diğer tüm eski ve hatalı supabase importları temizlendi.

// Mock data importları geçici olarak kaldırıldı
// Gerekirse burada yeniden implement edilebilir

// Etsy API sabitleri
const ETSY_API_BASE = "https://openapi.etsy.com/v3"
const ETSY_OAUTH_BASE = "https://www.etsy.com/oauth"

const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID || ""
const ETSY_REDIRECT_URI = process.env.ETSY_REDIRECT_URI || "http://localhost:3000/api/etsy/callback"
const ETSY_CLIENT_SECRET = process.env.ETSY_CLIENT_SECRET || ""
// Tüm gerekli izinleri içeren scope'lar
const ETSY_SCOPE = process.env.ETSY_SCOPE || "email_r profile_r shops_r shops_w listings_r listings_w listings_d transactions_r transactions_w profile_r address_r address_w billing_r cart_r cart_w"

// Environment variables kontrolü
function checkEtsyConfig() {
  const missing = []
  if (!ETSY_CLIENT_ID) missing.push("ETSY_CLIENT_ID")
  if (!process.env.ETSY_REDIRECT_URI) missing.push("ETSY_REDIRECT_URI") 
  if (!process.env.ETSY_SCOPE) missing.push("ETSY_SCOPE")
  
  if (missing.length > 0) {
    throw new Error(`Missing Etsy environment variables: ${missing.join(", ")}. Please add them to your .env.local file.`)
  }
}

export interface EtsyStore {
  shop_id: number
  shop_name: string
  title: string | null
  announcement: string | null
  currency_code: string
  is_vacation: boolean
  listing_active_count: number
  num_favorers: number
  url: string
  image_url_760x100: string | null
  review_count: number
  review_average: number
  is_active?: boolean
  last_synced_at?: string
  avatar_url?: string | null
}

export interface EtsyListing {
  listing_id: number
  user_id: number
  shop_id: number
  title: string
  description: string
  state: "active" | "inactive" | "draft" | "expired" | "sold_out"
  quantity: number
  url: string
  views?: number
  price: {
    amount: number
    divisor: number
    currency_code: string
  }
  tags: string[]
  materials?: string[]
  images: Array<{
    listing_id: number
    listing_image_id: number
    url_75x75: string
    url_170x135: string
    url_570xN: string
    url_fullxfull: string
    alt_text: string
    rank?: number
  }> | null
  created_timestamp: number
  last_modified_timestamp: number
  taxonomy_id?: number
  metrics?: {
    views: number
    favorites: number
    sold: number
  } | null
  has_variations?: boolean
  inventory?: any
  shipping_profile_id?: number
  processing_min?: number
  processing_max?: number
  processing_time_unit?: string
  is_personalizable?: boolean
  personalization_is_required?: boolean
  personalization_instructions?: string
  personalization_char_count_max?: number
}

export interface EtsyTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

// PKCE helpers - Node.js uyumlu
function generateCodeVerifier(): string {
  // Node.js'te crypto.getRandomValues yok, crypto.randomBytes kullanıyoruz
  const buffer = crypto.randomBytes(96)
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, 128)
}

function generateCodeChallenge(codeVerifier: string): string {
  const hash = crypto.createHash('sha256')
  hash.update(codeVerifier, 'utf8')
  return hash.digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export function generatePKCE() {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  return { codeVerifier, codeChallenge }
}

export async function getEtsyAuthUrl(userId: string): Promise<string> {
  try {
    console.log("Creating Etsy auth URL for user:", userId)
    
    // Environment variables kontrolü
    checkEtsyConfig()
    
    // PKCE oluştur
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    
    console.log("Generated PKCE:", { 
      codeVerifier: codeVerifier.substring(0, 10) + "...", 
      codeChallenge: codeChallenge.substring(0, 10) + "..." 
    })

    // Firebase'e code verifier'ı kaydet
    await db.collection("etsy_auth_sessions").doc(userId).set({
      code_verifier: codeVerifier,
      state: userId,
      created_at: new Date().toISOString()
    });

    console.log("Auth session stored successfully in Firebase")

    // Etsy OAuth URL'ini oluştur
    const authUrl = `https://www.etsy.com/oauth/connect?` +
      `response_type=code&` +
      `client_id=${ETSY_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(ETSY_REDIRECT_URI)}&` +
      `scope=${encodeURIComponent(ETSY_SCOPE)}&` +
      `state=${userId}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`
      
    return authUrl
  } catch (error) {
    console.error("Error generating Etsy auth URL:", error)
    throw error
  }
}

export async function exchangeCodeForToken(code: string, userId: string): Promise<EtsyTokens> {
  console.log("Exchanging code for token - userId:", userId)
  
  try {
    // Firebase'den code verifier'ı al
    const authSessionDoc = await db.collection("etsy_auth_sessions").doc(userId).get();
    const authSession = authSessionDoc.data();

    if (!authSessionDoc.exists || !authSession?.code_verifier) {
      console.error("Code verifier not found");
      throw new Error("Code verifier not found");
    }

    console.log("Found code verifier, making token request...");

    // Token isteği
    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': ETSY_CLIENT_ID,
      },
      body: qs.stringify({
        'grant_type': 'authorization_code',
        'client_id': ETSY_CLIENT_ID,
        'redirect_uri': ETSY_REDIRECT_URI,
        'code': code,
        'code_verifier': authSession.code_verifier,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token exchange error:", response.status, errorText);
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    const tokens: EtsyTokens = await response.json();
    console.log("Token exchange successful");

    // Code verifier'ı temizle
    await db.collection("etsy_auth_sessions").doc(userId).update({
      code_verifier: null
    });

    // Token'ları Firebase'e kaydet
    console.log("Storing tokens for user_id:", userId);
    const tokenData = {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      token_type: tokens.token_type || 'Bearer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log("Token data to store:", { 
      user_id: tokenData.user_id, 
      expires_at: tokenData.expires_at,
      token_type: tokenData.token_type,
      access_token_length: tokenData.access_token.length,
      refresh_token_length: tokenData.refresh_token.length
    });

    await db.collection("etsy_tokens").doc(userId).set(tokenData);

    // Fazla tokenları temizle
    await cleanupDuplicateTokens(userId);

    console.log("Tokens stored successfully");
    
    // Verification: Token'ın gerçekten kaydedildiğini kontrol et
    const verifyDoc = await db.collection("etsy_tokens").doc(userId).get();
    if (!verifyDoc.exists) {
      console.error("Token verification failed: Token not found");
    } else {
      console.log("Token verification successful:", verifyDoc.id);
    }

    return tokens;
  } catch (error) {
    console.error("Token exchange error:", error);
    throw error;
  }
}

// Rate limit kontrolü için yardımcı fonksiyonlar
const rateLimiter = {
  lastRequestTime: 0,
  minInterval: 100, // 100ms = saniyede 10 istek
  queue: [] as (() => Promise<any>)[],
  isProcessing: false,

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
      }
      
      const request = this.queue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        try {
          await request();
        } catch (error) {
          console.error("Rate limited request failed:", error);
        }
      }
    }
    this.isProcessing = false;
  },

  async addToQueue<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }
};

// Rate limit kontrolü ile API çağrısı yapan yardımcı fonksiyon
export async function rateLimitedFetch<T>(
  url: string,
  options: RequestInit,
  cacheKey?: string,
  skipCache = false
): Promise<T> {
  return rateLimiter.addToQueue(async () => {
    if (cacheKey && !skipCache) {
      const cachedData = cacheManager.get<T>(cacheKey);
      if (cachedData) {
        console.log(`📦 Using cached data for ${cacheKey}`);
        return cachedData;
      }
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded, waiting before retry...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        return rateLimitedFetch(url, options, cacheKey, skipCache);
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (cacheKey) {
      cacheManager.set(cacheKey, data);
    }
    
    return data;
  });
}

// refreshEtsyToken fonksiyonunu güncelle
export async function refreshEtsyToken(userId: string): Promise<string> {
  try {
    console.log("Refreshing Etsy token for user:", userId);
    
    // Firebase'den token bilgilerini al
    const tokenDoc = await db.collection("etsy_tokens").doc(userId).get();
    
    if (!tokenDoc.exists) {
      console.error("No token found for user:", userId);
      throw new Error("No token found");
    }
    
    const tokenData = tokenDoc.data();
    const refreshToken = tokenData?.refresh_token;
    
    if (!refreshToken) {
      console.error("No refresh token found for user:", userId);
      throw new Error("No refresh token found");
    }

    console.log("Found refresh token, making refresh request...");
    
    // Token yenileme isteği
    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': ETSY_CLIENT_ID
      },
      body: qs.stringify({
        'grant_type': 'refresh_token',
        'client_id': ETSY_CLIENT_ID,
        'refresh_token': refreshToken
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token refresh error:", response.status, errorText);
      throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
    }

    const tokens: EtsyTokens = await response.json();
    console.log("Token refresh successful");

    // Yenilenen token'ı Firebase'e kaydet
    await db.collection("etsy_tokens").doc(userId).update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log("Refreshed tokens stored successfully");
    return tokens.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    throw error;
  }
}

// Etsy token'ı al ve gerekirse yenile
export async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    // Firestore'dan token bilgilerini al
    const tokenDoc = await db.collection('etsy_tokens').doc(userId).get();
    
    if (!tokenDoc.exists) {
      console.log('No token found for user:', userId);
      return null;
    }

    const tokenData = tokenDoc.data();
    const access_token = tokenData?.access_token;
    const expires_at = tokenData?.expires_at;

    // Token geçerlilik süresini kontrol et
    const now = Date.now();
    if (expires_at && now < new Date(expires_at).getTime()) {
      return access_token;
    }

    // Token'ı yenile
    console.log('Token expired, refreshing...');
    return await refreshEtsyToken(userId);
  } catch (error: any) {
    console.error('Error getting valid access token:', error);
    
    // Token yenileme başarısız olursa, kullanıcıya yeniden bağlanması gerektiğini bildir
    if (error.message && (error.message.includes('Token refresh failed') || error.message.includes('No refresh token found'))) {
      console.error('Token refresh failed, user needs to reconnect');
      // Token geçersiz olduğunu işaretle
      try {
        await db.collection('etsy_tokens').doc(userId).update({
          is_invalid: true,
          invalid_reason: 'Token refresh failed',
          invalid_at: new Date().toISOString()
        });
      } catch (updateError) {
        console.error('Error updating token status:', updateError);
      }
    }
    
    return null;
  }
}

// Veritabanı yedekleme fonksiyonu
export async function getStoresFromDatabase(userId: string): Promise<EtsyStore[]> {
  try {
    const storesSnapshot = await db.collection('etsy_stores')
      .where('user_id', '==', userId)
      .get();
    
    const stores: EtsyStore[] = [];
    storesSnapshot.forEach(doc => {
      stores.push(doc.data() as EtsyStore);
    });
    
    return stores;
  } catch (error) {
    console.error('Error getting stores from database:', error);
    return [];
  }
}

// Veritabanına veri kaydetme fonksiyonu
async function storeEtsyData(userId: string, shopId: number, data: any, type: 'store' | 'listings' | 'stats' | 'receipts' | 'payments') {
  try {
    const docId = `${userId}_${shopId}_${type}`;
    await db.collection('etsy_data').doc(docId).set({
      user_id: userId,
      shop_id: shopId,
      type,
      data,
      updated_at: new Date().toISOString()
    });
    
    console.log(`Stored ${type} data for shop ${shopId}`);
    return true;
  } catch (error) {
    console.error(`Error storing ${type} data:`, error);
    return false;
  }
}

// Veritabanından veri okuma fonksiyonu
async function getStoredEtsyData(userId: string, shopId: number, type: 'store' | 'listings' | 'stats' | 'receipts' | 'payments') {
  try {
    const docId = `${userId}_${shopId}_${type}`;
    const doc = await db.collection('etsy_data').doc(docId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    return data?.data || null;
  } catch (error) {
    console.error(`Error getting ${type} data:`, error);
    return null;
  }
}

// Global flag to control automatic API fetching vs using cache
export let shouldUseOnlyCachedData = false;

// Function to toggle the cached data only mode
export function toggleCachedDataOnlyMode(useOnlyCachedData: boolean): void {
  shouldUseOnlyCachedData = useOnlyCachedData;
  console.log(`API mode set to: ${shouldUseOnlyCachedData ? 'Cached data only (using database/cache)' : 'Allow fresh API calls'}`);
}

// Önbellek için sabitler
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 saat (milisaniye cinsinden)
const CACHE_ENABLED = true; // Önbelleği etkinleştir/devre dışı bırak

// Veritabanından önbelleklenmiş verileri almak için yardımcı fonksiyon
async function getCachedData(userId: string, type: string, shopId?: number): Promise<any | null> {
  try {
    if (!CACHE_ENABLED) return null;
    
    console.log(`Checking cache for ${type} data for user ${userId}${shopId ? ` and shop ${shopId}` : ''}...`);
    
    // Firebase'den önbellek verisini al
    const cacheId = shopId ? `${userId}_${type}_${shopId}` : `${userId}_${type}`;
    const cacheDoc = await db.collection('etsy_cache').doc(cacheId).get();
    
    if (!cacheDoc.exists) {
      console.log(`No cached ${type} data found`);
      return null;
    }
    
    const cacheData = cacheDoc.data();
    if (!cacheData) {
      console.log(`No cached ${type} data content found`);
      return null;
    }
    
    // Önbellek süresini kontrol et
    const lastUpdated = new Date(cacheData.updated_at).getTime();
    const now = new Date().getTime();
    
    if (now - lastUpdated > CACHE_DURATION) {
      console.log(`Cached ${type} data is expired (${Math.round((now - lastUpdated) / (60 * 60 * 1000))} hours old)`);
      return null;
    }
    
    console.log(`Using cached ${type} data from ${new Date(cacheData.updated_at).toLocaleString()}`);
    return cacheData.data;
  } catch (error) {
    console.error(`Error getting cached ${type} data:`, error);
    return null;
  }
}

// Veritabanında veri önbelleklemek için yardımcı fonksiyon
async function setCachedData(userId: string, type: string, data: any, shopId?: number): Promise<void> {
  try {
    if (!CACHE_ENABLED) return;
    
    console.log(`Caching ${type} data for user ${userId}${shopId ? ` and shop ${shopId}` : ''}...`);
    
    // Firebase'e önbellek verisini kaydet
    const cacheId = shopId ? `${userId}_${type}_${shopId}` : `${userId}_${type}`;
    await db.collection('etsy_cache').doc(cacheId).set({
      user_id: userId,
      shop_id: shopId || null,
      data_type: type,
      data: data,
      updated_at: new Date().toISOString()
    });
    
    console.log(`Successfully cached ${type} data`);
  } catch (error) {
    console.error(`Error setting cached ${type} data:`, error);
  }
}

// getEtsyStores fonksiyonunu güncelle
export async function getEtsyStores(userId: string, skipCache = false): Promise<EtsyStore[]> {
  try {
    console.log(`=== getEtsyStores called for userId: ${userId} ===`);
    
    // Önbellek süresi (24 saat)
    const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
    
    // Önce veritabanından mağaza bilgilerini kontrol et
    try {
      const storesSnapshot = await db.collection('etsy_stores')
        .where('user_id', '==', userId)
        .get();
      
      if (!storesSnapshot.empty) {
        const dbStores: EtsyStore[] = [];
        storesSnapshot.forEach(doc => {
          const store = doc.data();
          dbStores.push({
            shop_id: store.shop_id,
            shop_name: store.shop_name,
            title: store.title,
            announcement: store.announcement,
            currency_code: store.currency_code,
            is_vacation: store.is_vacation || false,
            listing_active_count: store.listing_active_count || 0,
            num_favorers: store.num_favorers || 0,
            url: store.url || `https://www.etsy.com/shop/${store.shop_name}`,
            image_url_760x100: store.image_url_760x100,
            review_count: store.review_count || 0,
            review_average: store.review_average || 0,
            is_active: true,
            last_synced_at: store.last_synced_at || new Date().toISOString(),
            avatar_url: store.avatar_url || null
          });
        });
        
        console.log(`✅ Veritabanında ${dbStores.length} mağaza bulundu, API çağrısı yapılmayacak`);
        return dbStores;
      }
    } catch (dbCheckError) {
      console.error("Error checking database for stores:", dbCheckError);
      // Veritabanı hatası durumunda önbelleğe devam et
    }
    
    // Önce önbellekten kontrol et (skipCache true değilse)
    if (!skipCache) {
      const cachedStores = await getCachedData(userId, 'stores');
      if (cachedStores) {
        console.log(`Using ${cachedStores.length} cached stores`);
        return cachedStores;
      }
    } else {
      console.log('Skipping cache for stores as requested');
    }
    
    // Eğer API çağrısı yapılması isteniyorsa
    if (skipCache) {
      console.log(`Getting valid access token for user: ${userId}`);
      const accessToken = await getValidAccessToken(userId);
      
      if (!accessToken) {
        console.log('No valid access token found');
        throw new Error('RECONNECT_REQUIRED');
      }
      
      console.log('Fetching Etsy User ID using access token...');
      
      // Etsy API'ye istek göndererek kullanıcının Etsy User ID'sini al
      const userMeResponse = await fetch(`${ETSY_API_BASE}/application/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': ETSY_CLIENT_ID
        }
      });

      if (!userMeResponse.ok) {
        const errorText = await userMeResponse.text().catch(() => userMeResponse.statusText);
        console.error(`Error fetching Etsy user details (me endpoint): ${userMeResponse.status} - ${errorText}`);

        if (userMeResponse.status === 401 || userMeResponse.status === 403) {
          // Token geçersiz veya yetersiz izinler - yeniden bağlantı gerekli
          throw new Error('RECONNECT_REQUIRED');
        }
        throw new Error(`Failed to fetch Etsy user details: ${errorText}`);
      }

      const userData = await userMeResponse.json();
      const etsyUserId = userData.user_id;
      console.log(`Found Etsy User ID: ${etsyUserId}`);

      // Kullanıcının mağazalarını al
      console.log('Fetching user shops...');
      const shopsResponse = await fetch(`${ETSY_API_BASE}/application/users/${etsyUserId}/shops`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': ETSY_CLIENT_ID
        }
      });

      if (!shopsResponse.ok) {
        const errorText = await shopsResponse.text().catch(() => shopsResponse.statusText);
        console.error(`Error fetching shops: ${shopsResponse.status} - ${errorText}`);
        throw new Error(`Failed to fetch shops: ${errorText}`);
      }

      const shopsData = await shopsResponse.json();
      console.log(`Found ${shopsData.count} shops`);

      // Mağaza verilerini işle
      const shops = shopsData.results.map((shop: any) => ({
        shop_id: shop.shop_id,
        shop_name: shop.shop_name,
        title: shop.title,
        announcement: shop.announcement,
        currency_code: shop.currency_code,
        is_vacation: shop.is_vacation,
        listing_active_count: shop.listing_active_count,
        num_favorers: shop.num_favorers,
        url: shop.url,
        image_url_760x100: shop.image_url_760x100,
        review_count: shop.review_count || 0,
        review_average: shop.review_average || 0,
        is_active: true,
        last_synced_at: new Date().toISOString(),
        avatar_url: shop.icon_url_fullxfull || null
      }));

      // Mağaza verilerini veritabanına kaydet
      for (const shop of shops) {
        try {
          await db.collection('etsy_stores').doc(`${userId}_${shop.shop_id}`).set({
            user_id: userId,
            ...shop,
            updated_at: new Date().toISOString()
          });
        } catch (saveError) {
          console.error(`Error saving shop ${shop.shop_id} to database:`, saveError);
        }
      }

      // Önbelleğe kaydet
      await setCachedData(userId, 'stores', shops);

      return shops;
    }
    
    // Eğer buraya kadar geldiyse ve sadece önbellek kullanılması isteniyorsa boş dizi döndür
    if (shouldUseOnlyCachedData) {
      console.log('Using cached data only mode, returning empty array');
      return [];
    }
    
    // Aksi halde API çağrısı yap
    return await getEtsyStores(userId, true);
  } catch (error) {
    console.error('Error in getEtsyStores:', error);
    
    if (error instanceof Error && error.message === 'RECONNECT_REQUIRED') {
      throw error; // Yeniden bağlantı gerektiğini belirten hataları yeniden fırlat
    }
    
    return [];
  }
}

// JWT token parser helper
function parseJwt(token: string) {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    return null;
  }
}

// getEtsyListings fonksiyonunu güncelle
export async function getEtsyListings(
  userId: string,
  shopId: number,
  limit = 25,
  offset = 0,
  state: 'active' | 'inactive' | 'draft' | 'expired' | 'all' = 'active',
  skipCache = false
): Promise<{
  listings: EtsyListing[]
  count: number
}> {
  try {
    const cacheKey = `etsy_listings_${userId}_${shopId}_${limit}_${offset}_${state}`;
    
    console.log(`Fetching Etsy listings for user: ${userId}, shop: ${shopId}, state: ${state}, page: ${offset/limit + 1}, limit: ${limit}`)
    
    // Öncelikle token kontrolü yap
    const accessToken = await getValidAccessToken(userId)
    
    if (!accessToken) {
      console.log(`📦 No valid access token for user ${userId} - gerçek ürün çekilemiyor`)
      // Eğer token yoksa boş veri döndür
      return {
        listings: [],
        count: 0
      }
    }
    
    // shopId'nin gerçekten sayı olup olmadığını kontrol et
    if (!shopId || isNaN(Number(shopId))) {
      console.error(`Invalid shop ID: ${shopId}`);
      return {
        listings: [],
        count: 0
      };
    }
    
    // Etsy API'den gerçek mağaza bilgilerini al
    // Doğru shop_id kullandığımızdan emin olmak için
    try {
      const stores = await getEtsyStores(userId, skipCache);
      if (stores && stores.length > 0) {
        // Eğer verilen shopId, Etsy API'den gelen mağaza listesinde yoksa,
        // ilk mağazayı kullan
        const storeExists = stores.some(store => store.shop_id === shopId);
        if (!storeExists) {
          const firstStore = stores[0];
          console.log(`⚠️ Provided shop_id ${shopId} not found in user's stores. Using first store: ${firstStore.shop_id}`);
          shopId = firstStore.shop_id;
        }
      }
    } catch (error) {
      console.warn("Could not verify shop_id against user's stores:", error);
      // Devam et, shopId doğru olabilir
    }
    
    // Debug: Daha detaylı shop ID bilgisi
    console.log(`DEBUG ETSY API: Using shop ID=${shopId}, type=${typeof shopId}, isNaN=${isNaN(shopId)}`);
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      includes: "Images,Tags,ShopSectionIds,Inventory,Videos", // Daha fazla detay eklendi
    });
    
    // Endpoint'i state parametresine göre değiştir
    let endpoint = `${ETSY_API_BASE}/application/shops/${shopId}/listings`;
    if (state === 'active') {
      endpoint += '/active';
    } else if (state !== 'all') {
      // Belirli bir durum için sorgu yapılıyor
      params.append('state', state);
    }
    
    // Debug: Daha detaylı endpoint log'u
    console.log(`DEBUG ETSY API: Full endpoint: ${endpoint}?${params.toString()}`);
    
    try {
      const response = await fetch(`${endpoint}?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": ETSY_CLIENT_ID,
        }
      });
      
      if (!response.ok) {
        // 404 hatası - mağaza bulunamadı veya erişim yok
        if (response.status === 404) {
          console.error(`Shop ID ${shopId} not found or no access to listings. Status: 404`);
          return {
            listings: [],
            count: 0
          };
        }
        
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // API yanıtını incelemek için log'lama yapalım
      console.log(`API response received. Listings count: ${data.count || 0}`);
      if (data.results && data.results.length > 0) {
        console.log(`First listing ID: ${data.results[0].listing_id}`);
        console.log(`First listing has images: ${data.results[0].images ? 'Yes' : 'No'}`);
        if (data.results[0].images && data.results[0].images.length > 0) {
          console.log(`First image URL: ${data.results[0].images[0].url_570xN || 'Not available'}`);
        }
      }
      
      // Resim verilerini doğru formatta olduğundan emin olalım
      const processedResults = data.results ? await Promise.all(data.results.map(async (listing: any) => {
        // Eğer images alanı yoksa veya boşsa, ilgili listing_id için ayrıca fetch yap
        if (!listing.images || !Array.isArray(listing.images) || listing.images.length === 0) {
          try {
            const imageRes = await fetch(`${ETSY_API_BASE}/application/listings/${listing.listing_id}/images`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "x-api-key": ETSY_CLIENT_ID,
              }
            });
            if (imageRes.ok) {
              const imageData = await imageRes.json();
              // Sadece bu ürüne ait resimleri ekle (listing_id eşleşmeli)
              if (imageData.results && imageData.results.length > 0) {
                listing.images = imageData.results
                  .filter((img: any) => img.listing_id === listing.listing_id)
                  .map((img: any) => ({
                    listing_id: img.listing_id,
                    listing_image_id: img.listing_image_id,
                    url_570xN: img.url_570xN,
                    url_fullxfull: img.url_fullxfull,
                    alt_text: img.alt_text || listing.title || 'Product image'
                  }));
              } else {
                listing.images = [{
                  listing_id: listing.listing_id,
                  listing_image_id: 0,
                  url_570xN: `https://i.etsystatic.com/isla/etc/placeholder.jpg?listing_id=${listing.listing_id}`,
                  url_fullxfull: null,
                  alt_text: listing.title || 'Product image'
                }];
              }
            } else {
              listing.images = [{
                listing_id: listing.listing_id,
                listing_image_id: 0,
                url_570xN: `https://i.etsystatic.com/isla/etc/placeholder.jpg?listing_id=${listing.listing_id}`,
                url_fullxfull: null,
                alt_text: listing.title || 'Product image'
              }];
            }
          } catch (err) {
            listing.images = [{
              listing_id: listing.listing_id,
              listing_image_id: 0,
              url_570xN: `https://i.etsystatic.com/isla/etc/placeholder.jpg?listing_id=${listing.listing_id}`,
              url_fullxfull: null,
              alt_text: listing.title || 'Product image'
            }];
          }
        } else {
          // images alanı varsa, sadece bu ürüne ait olanları filtrele
          listing.images = listing.images
            .filter((img: any) => img.listing_id === listing.listing_id)
            .map((image: any) => ({
              ...image,
              url_570xN: image.url_570xN || `https://i.etsystatic.com/isla/etc/placeholder.jpg?listing_id=${listing.listing_id}`,
              url_fullxfull: image.url_fullxfull || image.url_570xN || null,
              alt_text: image.alt_text || listing.title || 'Product image'
            }));
        }
        return listing;
      })) : [];
      
      const result = {
        listings: processedResults,
        count: data.count || 0
      };
      
      return result;
    } catch (error) {
      console.error("getEtsyListings error:", error);
      
      // Eğer API çağrısında hata varsa (404 gibi), boş sonuç döndür
      return { 
        listings: [], 
        count: 0 
      };
    }
  } catch (error) {
    console.error("Critical error in getEtsyListings:", error);
    return { listings: [], count: 0 };
  }
}

export async function syncEtsyDataToDatabase(userId: string): Promise<void> {
  try {
    console.log("Starting Etsy data sync for user:", userId)
    
    // Önce stores bilgisini çek
    const stores = await getEtsyStores(userId, true) // force refresh
    console.log("Fetched stores:", stores.length)
    
    if (stores.length > 0) {
      const primaryStore = stores[0] // İlk store'u ana store olarak kullan
      
      // Profile'ı gerçek store bilgileriyle güncelle
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          etsy_shop_name: primaryStore.shop_name,
          etsy_shop_id: primaryStore.shop_id.toString(),
          last_synced_at: new Date().toISOString()
        })
        .eq("id", userId)

      if (profileError) {
        console.error("Profile update error:", profileError)
        throw profileError
      }
      
      console.log("Profile updated with real store data:", primaryStore.shop_name)
      
      // Fetch listings data
      const { listings } = await getEtsyListings(userId, primaryStore.shop_id, 100, 0, 'active', true);

      // Calculate stats from listings data
      const totalListings = listings.length;
      const totalViews = listings.reduce((sum, listing) => sum + (listing.metrics?.views || 0), 0);
      const totalOrders = listings.reduce((sum, listing) => sum + (listing.metrics?.sold || 0), 0);
      const totalRevenue = listings.reduce((sum, listing) => {
        const priceInDollars = (listing.price?.amount || 0) / (listing.price?.divisor || 1);
        return sum + (priceInDollars * (listing.metrics?.sold || 0));
      }, 0);

      const stats = {
        totalListings,
        totalOrders,
        totalViews,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)), // Format to 2 decimal places
        source: "calculated_from_listings"
      };

      // Tüm verileri paralel olarak çek ve kaydet
      await Promise.all([
        // Listings
        storeEtsyData(userId, primaryStore.shop_id, listings, 'listings'),
        
        // Stats
        storeEtsyData(userId, primaryStore.shop_id, stats, 'stats'),
        
        // Receipts
        getEtsyReceipts(userId, primaryStore.shop_id, 100, 0, true)
          .then(({ receipts }) => storeEtsyData(userId, primaryStore.shop_id, receipts, 'receipts')),
        
        // Payments
        getEtsyPayments(userId, primaryStore.shop_id, 100, 0, true)
          .then(({ payments }) => storeEtsyData(userId, primaryStore.shop_id, payments, 'payments'))
      ])
      
      console.log("All data synced successfully")
      
    } else {
      // Store bulunamadı ama token geçerli - bu normal olabilir
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          etsy_shop_name: "Etsy Bağlantısı Aktif",
          etsy_shop_id: "connected",
          last_synced_at: new Date().toISOString()
        })
        .eq("id", userId)
      
      if (profileError) {
        console.error("Profile update error:", profileError)
        console.warn("Could not update profile but connection is successful")
      }
      
      console.log("No stores found but token is valid - marked as connected")
    }
    
    console.log("Etsy data sync completed successfully")
    
  } catch (error) {
    console.error("Error in syncEtsyDataToDatabase:", error)
    
    // Hata durumunda da en azından bağlantı kurulduğunu belirt
    try {
      await supabaseAdmin
        .from("profiles")
        .update({
          etsy_shop_name: "Etsy Bağlandı (Sınırlı Erişim)",
          etsy_shop_id: "limited",
          last_synced_at: new Date().toISOString()
        })
        .eq("id", userId)
      
      console.log("Marked as limited access due to API restrictions")
    } catch (fallbackError) {
      console.error("Fallback update also failed:", fallbackError)
      console.warn("Could not update profile even with fallback")
    }
    
    console.log("Sync completed with limitations")
  }
}

// Finansal veri tipleri
export interface EtsyPayment {
  payment_id: number
  buyer_user_id: number
  shop_id: number
  receipt_id: number
  amount_gross: {
    amount: number
    divisor: number
    currency_code: string
  }
  amount_fees: {
    amount: number
    divisor: number
    currency_code: string
  }
  amount_net: {
    amount: number
    divisor: number
    currency_code: string
  }
  posted_gross: {
    amount: number
    divisor: number
    currency_code: string
  }
  posted_fees: {
    amount: number
    divisor: number
    currency_code: string
  }
  posted_net: {
    amount: number
    divisor: number
    currency_code: string
  }
  adjusted_gross: {
    amount: number
    divisor: number
    currency_code: string
  }
  adjusted_fees: {
    amount: number
    divisor: number
    currency_code: string
  }
  adjusted_net: {
    amount: number
    divisor: number
    currency_code: string
  }
  currency: string
  shop_currency: string
  buyer_currency: string
  shipping_user_id: number
  shipping_address_id: number
  billing_address_id: number
  status: string
  shipped_timestamp: number
  create_timestamp: number
  update_timestamp: number
}

export interface EtsyReceipt {
  receipt_id: number
  receipt_type: number
  seller_user_id: number
  seller_email: string
  buyer_user_id: number
  buyer_email: string
  name: string
  first_line: string
  second_line: string
  city: string
  state: string
  zip: string
  formatted_address: string
  country_iso: string
  payment_method: string
  payment_email: string
  message_from_seller: string
  message_from_buyer: string
  message_from_payment: string
  is_paid: boolean
  is_shipped: boolean
  create_timestamp: number
  update_timestamp: number
  grandtotal: {
    amount: number
    divisor: number
    currency_code: string
  }
  subtotal: {
    amount: number
    divisor: number
    currency_code: string
  }
  total_price: {
    amount: number
    divisor: number
    currency_code: string
  }
  total_shipping_cost: {
    amount: number
    divisor: number
    currency_code: string
  }
  total_tax_cost: {
    amount: number
    divisor: number
    currency_code: string
  }
  total_vat_cost: {
    amount: number
    divisor: number
    currency_code: string
  }
  discount_amt: {
    amount: number
    divisor: number
    currency_code: string
  }
  gift_wrap_price: {
    amount: number
    divisor: number
    currency_code: string
  }
}

export interface EtsyLedgerEntry {
  entry_id: number
  ledger_id: number
  sequence_number: number
  amount: {
    amount: number
    divisor: number
    currency_code: string
  }
  currency: string
  description: string
  balance: {
    amount: number
    divisor: number
    currency_code: string
  }
  create_date: number
}

// Etsy Payments API - Gerçek ödeme verilerini çeker
export async function getEtsyPayments(
  userId: string,
  shopId: number,
  limit = 25,
  offset = 0,
  skipCache = false
): Promise<{
  payments: EtsyPayment[]
  count: number
}> {
  const cacheKey = `etsy_payments_${userId}_${shopId}_${limit}_${offset}`;
  
  try {
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log(`📦 No valid access token for user ${userId} - generating mock payments`);
      const mockData = generateMockPayments(limit, shopId);
      return mockData;
    }
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    const data = await fetchWithCache<{results: EtsyPayment[], count: number}>(
      `${ETSY_API_BASE}/application/shops/${shopId}/payments?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": ETSY_CLIENT_ID,
        },
        cacheKey,
        skipCache,
        mockDataGenerator: () => {
          console.log(`📦 Generating mock payments data for shop ${shopId}`);
          return generateMockPayments(limit, shopId);
        }
      }
    );
    
    return {
      payments: data.results || [],
      count: data.count || 0
    };
  } catch (error) {
    console.error("getEtsyPayments error:", error);
    
    // Check if we have stale cached data
    const cachedData = cacheManager.get<{payments: EtsyPayment[], count: number}>(cacheKey);
    if (cachedData) {
      console.log(`📦 Using cached payments data after error: ${cachedData.payments.length} payments`);
      return cachedData;
    }
    
    // Gerçek veri yoksa boş dizi döndür
    return { payments: [], count: 0 };
  }
}

// Etsy Receipts API - Sipariş verilerini çeker
export async function getEtsyReceipts(
  userId: string,
  shopId: number,
  limit = 25,
  offset = 0,
  skipCache = false
): Promise<{
  receipts: EtsyReceipt[]
  count: number
}> {
  const cacheKey = `etsy_receipts_${userId}_${shopId}_${limit}_${offset}`;
  
  try {
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log(`📦 No valid access token for user ${userId} - generating mock receipts`);
      const mockData = generateMockReceipts(limit, shopId);
      return mockData;
    }
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    const data = await fetchWithCache<{results: EtsyReceipt[], count: number}>(
      `${ETSY_API_BASE}/application/shops/${shopId}/receipts?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": ETSY_CLIENT_ID,
        },
        cacheKey,
        skipCache,
        mockDataGenerator: () => {
          console.log(`📦 Generating mock receipts data for shop ${shopId}`);
          return generateMockReceipts(limit, shopId);
        }
      }
    );
    
    return {
      receipts: data.results || [],
      count: data.count || 0
    };
  } catch (error) {
    console.error("getEtsyReceipts error:", error);
    
    // Check if we have stale cached data
    const cachedData = cacheManager.get<{receipts: EtsyReceipt[], count: number}>(cacheKey);
    if (cachedData) {
      console.log(`📦 Using cached receipts data after error: ${cachedData.receipts.length} receipts`);
      return cachedData;
    }
    
    // Gerçek veri yoksa boş dizi döndür
    return { receipts: [], count: 0 };
  }
}

// Taxonomy fonksiyonları
export async function getSellerTaxonomyNodes(userId?: string): Promise<any[]> {
  try {
    // Önce önbellekten kontrol et
    const cachedTaxonomy = await getCachedData(userId || 'global', 'taxonomy');
    if (cachedTaxonomy) {
      return cachedTaxonomy;
    }
    
    // Eğer userId varsa, token ile API çağrısı yap
    if (userId) {
      const accessToken = await getValidAccessToken(userId);
      if (accessToken) {
        console.log("Fetching taxonomy with access token");
        const response = await fetch(`${ETSY_API_BASE}/application/seller-taxonomy/nodes`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-api-key': ETSY_CLIENT_ID
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Önbelleğe kaydet
          await setCachedData(userId, 'taxonomy', data.results);
          
          return data.results;
        } else {
          console.error("Error fetching taxonomy with token:", response.status);
        }
      }
    }
    
    // Token yoksa veya API çağrısı başarısız olduysa, açık API'yi kullan
    console.log("Fetching taxonomy with public API");
    const response = await fetch(`${ETSY_API_BASE}/application/seller-taxonomy/nodes`, {
      headers: {
        'x-api-key': ETSY_CLIENT_ID
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch taxonomy: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Global önbelleğe kaydet
    await setCachedData('global', 'taxonomy', data.results);
    
    return data.results;
  } catch (error) {
    console.error("Error fetching taxonomy:", error);
    return [];
  }
}

export async function getPropertiesByTaxonomyId(taxonomyId: number): Promise<any[]> {
  try {
    // Önce önbellekten kontrol et
    const cachedProperties = await getCachedData('global', `taxonomy_properties_${taxonomyId}`);
    if (cachedProperties) {
      return cachedProperties;
    }
    
    // API'den al
    const response = await fetch(`${ETSY_API_BASE}/application/seller-taxonomy/nodes/${taxonomyId}/properties`, {
      headers: {
        'x-api-key': ETSY_CLIENT_ID
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch taxonomy properties: ${response.status}`);
    }
    
    const data = await response.json();
    const results = data.results || [];
    
    // Önbelleğe kaydet
    await setCachedData('global', `taxonomy_properties_${taxonomyId}`, results);
    
    return results;
  } catch (error) {
    console.error(`Error fetching properties for taxonomy ${taxonomyId}:`, error);
    return [];
  }
}

// Shipping profile interface
export interface EtsyShippingProfile {
  shipping_profile_id: number;
  title: string;
  user_id: number;
  min_processing_days: number;
  max_processing_days: number;
  processing_days_display_label: string;
  origin_country_iso: string;
  is_deleted: boolean;
  shipping_carrier_id: number;
  mail_class: string;
  min_delivery_days: number;
  max_delivery_days: number;
  destination_country_iso: string;
  destination_region: string;
  primary_cost: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  secondary_cost: {
    amount: number;
    divisor: number
    currency_code: string;
  };
}

// Processing profile interface
export interface EtsyProcessingProfile {
  processing_profile_id: number;
  title: string;
  user_id: number;
  min_processing_days: number;
  max_processing_days: number
  processing_days_display_label: string;
  is_deleted: boolean;
}

// Get shipping profiles for a shop
export async function getShippingProfiles(userId: string, shopId: number): Promise<EtsyShippingProfile[]> {
  try {
    // Önce önbellekten kontrol et
    const cachedProfiles = await getCachedData(userId, `shipping_profiles_${shopId}`);
    if (cachedProfiles) {
      return cachedProfiles;
    }
    
    // API'den al
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      throw new Error('No valid access token');
    }
    
    const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/shipping-profiles`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': ETSY_CLIENT_ID
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch shipping profiles: ${response.status}`);
    }
    
    const data = await response.json();
    const profiles = data.results || [];
    
    // Önbelleğe kaydet
    await setCachedData(userId, `shipping_profiles_${shopId}`, profiles);
    
    return profiles;
  } catch (error) {
    console.error(`Error fetching shipping profiles for shop ${shopId}:`, error);
    return [];
  }
}

// Get processing profiles for a shop
export async function getProcessingProfiles(userId: string, shopId: number) {
  try {
    const shippingProfiles = await getShippingProfiles(userId, shopId);
    
    if (!shippingProfiles || !Array.isArray(shippingProfiles)) {
      throw new Error('Invalid shipping profiles response');
    }

    if (shippingProfiles.length === 0) {
      // Varsayılan profil
      return [{
        processing_profile_id: 0,
        title: 'Varsayılan İşlem Profili',
        user_id: 0,
        min_processing_days: 1,
        max_processing_days: 3,
        processing_days_display_label: '1-3 gün',
        is_deleted: false
      }];
    }

    // Shipping profilelardan processing profilleri oluştur
    return shippingProfiles.map(profile => ({
      processing_profile_id: profile.shipping_profile_id,
      title: profile.title,
      user_id: profile.user_id,
      min_processing_days: profile.min_processing_days,
      max_processing_days: profile.max_processing_days,
      processing_days_display_label: `${profile.min_processing_days}-${profile.max_processing_days} gün`,
      is_deleted: false
    }));
  } catch (error) {
    console.error('Error getting processing profiles:', error);
    throw error;
  }
}

// Create a shipping profile for a shop
export async function createShippingProfile(
  userId: string,
  shopId: number,
  data: {
    title: string;
    origin_country_iso: string;
    primary_cost: number;
    secondary_cost: number;
    min_processing_days: number;
    max_processing_days: number;
    destination_country_iso?: string;
    destination_region?: string;
  }
): Promise<EtsyShippingProfile> {
  try {
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log(`No valid access token for user ${userId} - cannot create shipping profile`);
      throw new Error('RECONNECT_REQUIRED');
    }

    const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/shipping-profiles`, {
      method: 'POST',
    headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': ETSY_CLIENT_ID,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        title: data.title,
        origin_country_iso: data.origin_country_iso,
        primary_cost: data.primary_cost.toString(),
        secondary_cost: data.secondary_cost.toString(),
        min_processing_days: data.min_processing_days.toString(),
        max_processing_days: data.max_processing_days.toString(),
        ...(data.destination_country_iso ? { destination_country_iso: data.destination_country_iso } : {}),
        ...(data.destination_region ? { destination_region: data.destination_region } : {})
      })
    });

  if (!response.ok) {
      throw new Error(`Failed to create shipping profile: ${response.status} ${response.statusText}`);
  }

    const result = await response.json();
    return result.shipping_profile;
  } catch (error) {
    console.error("Error creating shipping profile:", error);
    throw error;
  }
}

// Update a shipping profile
export async function updateShippingProfile(
  userId: string,
  shopId: number,
  profileId: number,
  data: {
    title?: string;
    origin_country_iso?: string;
    primary_cost?: number;
    secondary_cost?: number;
    min_processing_days?: number;
    max_processing_days?: number;
    destination_country_iso?: string;
    destination_region?: string;
  }
): Promise<EtsyShippingProfile> {
  try {
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log(`No valid access token for user ${userId} - cannot update shipping profile`);
      throw new Error('RECONNECT_REQUIRED');
  }

    const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/shipping-profiles/${profileId}`, {
      method: 'PUT',
    headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': ETSY_CLIENT_ID,
        'Content-Type': 'application/x-www-form-urlencoded'
    },
      body: new URLSearchParams(
        Object.entries(data).reduce((acc: Record<string, string>, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value.toString();
          }
          return acc;
        }, {})
      )
    });

  if (!response.ok) {
      throw new Error(`Failed to update shipping profile: ${response.status} ${response.statusText}`);
  }

    const result = await response.json();
    return result.shipping_profile;
  } catch (error) {
    console.error("Error updating shipping profile:", error);
    throw error;
  }
}

// Delete a shipping profile
export async function deleteShippingProfile(
  userId: string,
  shopId: number,
  profileId: number
): Promise<void> {
  try {
  const accessToken = await getValidAccessToken(userId);
    
  if (!accessToken) {
      console.log(`No valid access token for user ${userId} - cannot delete shipping profile`);
      throw new Error('RECONNECT_REQUIRED');
    }

    const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/shipping-profiles/${profileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': ETSY_CLIENT_ID
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete shipping profile: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error deleting shipping profile:", error);
    throw error;
  }
}

// CreateListingData interface for creating a new listing
export interface CreateListingData {
  title: string;
  description: string;
  price: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  quantity: number;
  shipping_profile_id: number;
  processing_profile_id: number;
  tags: string[];
  materials: string[];
  is_personalizable?: boolean;
  personalization_is_required?: boolean;
  personalization_instructions?: string;
  primary_color?: string;
  secondary_color?: string;
  width?: number;
  width_unit?: string;
  height?: number;
  height_unit?: string;
  taxonomy_id?: number;
  state: "active" | "draft";
  image_ids?: number[];
  who_made?: "i_did" | "someone_else" | "collective";
  when_made?: string;
  variations?: {
    size: string;
    pattern: string;
    price: number;
    is_active: boolean;
  }[];
  shop_section_id?: number;
}

// Function to invalidate shop cache to ensure fresh data on next fetch
export async function invalidateShopCache(userId: string, shopId: number): Promise<void> {
  try {
    console.log(`Invalidating cache for user: ${userId}, shop: ${shopId}`);
    // This could involve Redis, local storage, or database caching
    // For now, just log it since we don't have explicit caching yet
  } catch (error) {
    console.error("Error invalidating shop cache:", error);
  }
}

// Function to reorder listing images
export async function reorderListingImages(
  userId: string, 
  shopId: number, 
  listingId: number, 
  imageIds: number[]
): Promise<boolean> {
  try {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      throw new Error("No valid access token found");
    }

    console.log(`Reordering images for listing: ${listingId}, Shop: ${shopId}, Image IDs:`, imageIds);

    const response = await fetch(
      `${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}/images/reorder`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': ETSY_CLIENT_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ listing_image_ids: imageIds })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from Etsy API (reorder images):', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in reorderListingImages:', error);
    return false;
  }
}

export async function activateEtsyListing(accessToken: string, shopId: number, listingId: number) {
    console.log(`[ETSY_API] Activating listing ${listingId}`);
    
    const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'active' }),
    });
    
    if(!response.ok) {
        const error = await response.json();
        console.error(`[ETSY_API] ❌ Failed to activate listing ${listingId}:`, error);
        throw new Error(error.message || 'Listing aktifleştirilemedi.');
    }
    
    console.log(`[ETSY_API] ✅ Successfully activated listing ${listingId}`);
}

// Dükkan bölümlerini getir
export async function getShopSections(accessToken: string, shopId: number): Promise<any[]> {
    console.log(`[ETSY_API] Dükkan bölümleri çekiliyor: Shop ID ${shopId}`);
    const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/sections`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID! },
    });
    if (!response.ok) {
        console.error("Dükkan bölümleri alınamadı.");
        return [];
    }
    const data = await response.json();
    return data.results || [];
}

// Aynı kullanıcı için birden fazla token varsa en son olanı dışındakileri temizle
async function cleanupDuplicateTokens(userId: string): Promise<void> {
  try {
    console.log("Cleaning up duplicate tokens for user:", userId);
    
    // Kullanıcının tüm tokenlarını al
    const tokensSnapshot = await db.collection("etsy_tokens")
      .where("user_id", "==", userId)
      .orderBy("created_at", "desc")
      .get();
    
    if (tokensSnapshot.size <= 1) {
      console.log("No duplicate tokens found");
      return;
    }
    
    console.log(`Found ${tokensSnapshot.size} tokens, keeping the newest one`);
    
    // İlk token en yenisi, onu tut ve diğerlerini sil
    let isFirst = true;
    const deletePromises: Promise<any>[] = [];
    
    tokensSnapshot.forEach(doc => {
      if (isFirst) {
        isFirst = false;
        return;
      }
      
      console.log(`Deleting old token: ${doc.id}`);
      deletePromises.push(doc.ref.delete());
    });
    
    await Promise.all(deletePromises);
    console.log(`Deleted ${deletePromises.length} old tokens`);
  } catch (error) {
    console.error("Error cleaning up duplicate tokens:", error);
  }
}

// Geçici mock fonksiyonlar
function generateMockListings(limit = 10, shopId = 1) {
  return {
    listings: Array(limit).fill(null).map((_, i) => ({
      listing_id: i + 1,
      shop_id: shopId,
      title: `Mock Listing ${i + 1}`,
      state: "active" as "active" | "inactive" | "draft",
      price: { amount: 1000, divisor: 100, currency_code: "USD" },
      tags: [],
      images: [],
      user_id: 1,
      description: "Mock description",
      url: "https://example.com",
      quantity: 10
    })),
    count: limit
  };
}

function generateMockReceipts(limit = 10, shopId = 1) {
  return {
    receipts: Array(limit).fill(null).map((_, i) => ({
      receipt_id: i + 1,
      shop_id: shopId,
      receipt_type: 0,
      seller_user_id: 1,
      seller_email: "seller@example.com",
      buyer_user_id: 100 + i,
      buyer_email: "buyer@example.com",
      name: "Mock Buyer",
      first_line: "123 Main St",
      second_line: "",
      city: "Anytown",
      state: "CA",
      zip: "12345",
      formatted_address: "123 Main St, Anytown, CA 12345",
      country_iso: "US",
      payment_method: "credit_card",
      payment_email: "buyer@example.com",
      message_from_seller: "",
      message_from_buyer: "",
      message_from_payment: "",
      is_paid: true,
      is_shipped: false,
      create_timestamp: Date.now() / 1000 - 86400 * i,
      update_timestamp: Date.now() / 1000,
      grandtotal: { amount: 1500, divisor: 100, currency_code: "USD" },
      subtotal: { amount: 1000, divisor: 100, currency_code: "USD" },
      total_price: { amount: 1000, divisor: 100, currency_code: "USD" },
      total_shipping_cost: { amount: 500, divisor: 100, currency_code: "USD" },
      total_tax_cost: { amount: 0, divisor: 100, currency_code: "USD" },
      total_vat_cost: { amount: 0, divisor: 100, currency_code: "USD" },
      discount_amt: { amount: 0, divisor: 100, currency_code: "USD" },
      gift_wrap_price: { amount: 0, divisor: 100, currency_code: "USD" }
    })),
    count: limit
  };
}

function generateMockPayments(limit = 10, shopId = 1) {
  return {
    payments: Array(limit).fill(null).map((_, i) => ({
      payment_id: i + 1,
      buyer_user_id: 100 + i,
      shop_id: shopId,
      receipt_id: i + 1,
      amount_gross: { amount: 1500, divisor: 100, currency_code: "USD" },
      amount_fees: { amount: 150, divisor: 100, currency_code: "USD" },
      amount_net: { amount: 1350, divisor: 100, currency_code: "USD" },
      posted_gross: { amount: 1500, divisor: 100, currency_code: "USD" },
      posted_fees: { amount: 150, divisor: 100, currency_code: "USD" },
      posted_net: { amount: 1350, divisor: 100, currency_code: "USD" },
      adjusted_gross: { amount: 0, divisor: 100, currency_code: "USD" },
      adjusted_fees: { amount: 0, divisor: 100, currency_code: "USD" },
      adjusted_net: { amount: 0, divisor: 100, currency_code: "USD" },
      currency: "USD",
      shop_currency: "USD",
      buyer_currency: "USD",
      shipping_user_id: 100 + i,
      shipping_address_id: 200 + i,
      billing_address_id: 200 + i,
      status: "paid",
      shipped_timestamp: 0,
      create_timestamp: Date.now() / 1000 - 86400 * i,
      update_timestamp: Date.now() / 1000
    })),
    count: limit
  };
}

function generateMockLedgerEntries(limit = 10, shopId = 1) {
  return {
    entries: Array(limit).fill(null).map((_, i) => ({
      entry_id: i + 1,
      ledger_id: 1,
      sequence_number: i,
      amount: { amount: i % 2 === 0 ? 1500 : -150, divisor: 100, currency_code: "USD" },
      currency: "USD",
      description: i % 2 === 0 ? "Payment" : "Fee",
      balance: { amount: 10000 - (i * 100), divisor: 100, currency_code: "USD" },
      create_date: Date.now() / 1000 - 86400 * i
    })),
    count: limit
  };
}

// Eksik olan createEtsyListing fonksiyonunu ekle
export async function createEtsyListing(accessToken: string, shopId: number, data: any): Promise<any> {
  try {
    console.log("Creating new Etsy listing for shop:", shopId);
    
    // Etsy API'ye gönderilecek veri yapısını hazırla
    const etsyListingData = {
      title: data.title || '',
      description: data.description || '',
      price: data.price || 0,
      quantity: data.quantity || 4, // Varsayılan değer
      shipping_profile_id: data.shipping_profile_id || null,
      taxonomy_id: data.taxonomy_id || 1027, // Default: Wall Decor
      tags: data.tags || [],
      state: data.state || 'draft',
      who_made: data.who_made || 'i_did',
      when_made: data.when_made || 'made_to_order',
      is_supply: data.is_supply || false,
      shop_section_id: data.shop_section_id || null,
      
      // Kişiselleştirme ayarları
      is_personalizable: data.is_personalizable || true,
      personalization_is_required: data.personalization_is_required || false,
      personalization_instructions: data.personalization_instructions || '',
      personalization_char_count_max: data.personalization_char_count_max || 256,
      
      // Varyasyon ayarları
      has_variations: data.has_variations || false
    };

    // OAuth 1.0 header oluştur
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Math.random().toString(36).substring(2, 15);
    
    const authHeader = `OAuth oauth_consumer_key="${process.env.ETSY_CONSUMER_KEY}", oauth_token="${accessToken}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${timestamp}", oauth_nonce="${nonce}", oauth_version="1.0"`;

    // Etsy API'ye POST isteği
    const etsyApiUrl = `${ETSY_API_BASE}/application/shops/${shopId}/listings`;
    
    console.log('📤 Etsy API URL:', etsyApiUrl);
    
    const response = await fetch(etsyApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'x-api-key': process.env.ETSY_CONSUMER_KEY || ''
      },
      body: JSON.stringify(etsyListingData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Etsy API hatası:', errorText);
      
      let errorMessage = 'Etsy API hatası';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorText;
      } catch (e) {
        errorMessage = errorText;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ Etsy listing oluşturuldu:', result.listing_id);
    
    return result;
  } catch (error) {
    console.error("createEtsyListing error:", error);
    throw error;
  }
}

export async function updateListing(accessToken: string, shopId: number, listingId: number, data: any): Promise<any> {
  try {
    console.log("Updating Etsy listing:", listingId);
    
    const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-api-key': process.env.ETSY_CLIENT_ID!,
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to update listing: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("updateListing error:", error);
    throw error;
  }
}

export async function deleteListing(accessToken: string, shopId: number, listingId: number): Promise<any> {
  try {
    console.log("Deleting Etsy listing:", listingId);
    
    const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': process.env.ETSY_CLIENT_ID!,
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete listing: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error("deleteListing error:", error);
    throw error;
  }
}

export async function calculateFinancialSummary(userId: string): Promise<any> {
  return {
    totalRevenue: 0,
    totalExpenses: 0,
    profit: 0,
    orderCount: 0
  };
}

export async function invalidateUserCache(userId: string): Promise<void> {
  console.log("Cache invalidated for user:", userId);
}

export async function createEtsyDataTables(): Promise<void> {
  console.log("Etsy data tables would be created here");
}

export async function updateShop(accessToken: string, shopId: number, data: any): Promise<any> {
  try {
    console.log("Updating Etsy shop:", shopId);
    
    const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-api-key': process.env.ETSY_CLIENT_ID!,
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to update shop: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("updateShop error:", error);
    throw error;
  }
}

// Bu fonksiyon yukarıda birleştirildi
// Firebase ile önbellek işlemleri artık tek bir yerde tanımlanmıştır.
// Satır 649-691'de tanımlanan getCachedData ve setCachedData fonksiyonları kullanılacaktır.

/**
 * @deprecated Use createEtsyListing instead. This is kept for backward compatibility.
 */
export const createDraftListing = createEtsyListing;

export async function uploadFilesToEtsy(
  accessToken: string,
  shopId: number,
  listingId: number,
  files: File[]
): Promise<any> {
  const url = `${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}/images`;
  
  const results = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await rateLimitedFetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData
    });
    
    results.push(response);
  }
  
  return results;
}

export async function addInventoryWithVariations(
  accessToken: string,
  shopId: number,
  listingId: number,
  variations: any[]
): Promise<any> {
  // First, update the listing to have variations
  await updateListing(accessToken, shopId, listingId, {
    has_variations: true
  });
  
  // Then add the variations
  const url = `${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}/inventory`;
  
  const response = await rateLimitedFetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      products: variations.map(variation => ({
        sku: '',
        property_values: [
          {
            property_id: 513, // Size
            value_ids: [],
            values: [variation.size]
          },
          {
            property_id: 514, // Pattern
            value_ids: [],
            values: [variation.pattern]
          }
        ],
        offerings: [
          {
            price: variation.price,
            quantity: 999,
            is_enabled: variation.is_active
          }
        ]
      }))
    })
  });
  
  return response;
}
