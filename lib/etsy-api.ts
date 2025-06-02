import crypto from "crypto"
import qs from "querystring"
import { supabaseAdmin } from "./supabase"
import { cacheManager } from "./cache"
import { fetchWithCache } from "./api-utils"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/database.types";
// Mock data importları geçici olarak kaldırıldı
// Gerekirse burada yeniden implement edilebilir

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

// Etsy API v3 endpoints
const ETSY_API_BASE = "https://api.etsy.com/v3"
const ETSY_OAUTH_BASE = "https://www.etsy.com/oauth"

const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID || ""
const ETSY_REDIRECT_URI = process.env.ETSY_REDIRECT_URI || ""
// Tüm gerekli izinleri içeren scope'lar
const ETSY_SCOPE = process.env.ETSY_SCOPE || "email_r shops_r shops_w listings_r listings_w listings_d transactions_r transactions_w profile_r address_r address_w billing_r cart_r cart_w"

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
  title: string
  announcement: string
  currency_code: string
  is_vacation: boolean
  listing_active_count: number
  num_favorers: number
  url: string
  image_url_760x100: string
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
  state: "active" | "inactive" | "draft"
  quantity: number
  url: string
  views?: number
  price: {
    amount: number
    divisor: number
    currency_code: string
  }
  tags: string[]
  images: Array<{
    listing_id: number
    listing_image_id: number
    url_75x75: string
    url_170x135: string
    url_570xN: string
    url_fullxfull: string
    alt_text: string
  }>
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
    
    // PKCE oluştur - örnekteki gibi
  const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    
    console.log("Generated PKCE:", { 
      codeVerifier: codeVerifier.substring(0, 10) + "...", 
      codeChallenge: codeChallenge.substring(0, 10) + "..." 
    })

    // Store'dan code verifier'ı al ve sakla - örnekteki gibi
    const { data: existingStore } = await supabaseAdmin
      .from("etsy_auth_sessions")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (existingStore) {
      // Mevcut store'u güncelle
      await supabaseAdmin
        .from("etsy_auth_sessions")
        .update({
          code_verifier: codeVerifier,
    state: userId,
          created_at: new Date().toISOString()
        })
        .eq("user_id", userId)
    } else {
      // Yeni store oluştur
      const { error } = await supabaseAdmin
        .from("etsy_auth_sessions")
        .insert({
          user_id: userId,
          code_verifier: codeVerifier,
          state: userId,
        })

      if (error) {
        console.error("Database error:", error)
        throw new Error(`Failed to store auth session: ${error.message}`)
      }
    }

    console.log("Auth session stored successfully")

    // Etsy OAuth URL'ini oluştur - örnekteki gibi
    const authUrl = `https://www.etsy.com/oauth/connect?` +
      `response_type=code&` +
      `client_id=${ETSY_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(ETSY_REDIRECT_URI)}&` +
      `scope=${encodeURIComponent(ETSY_SCOPE)}&` +
      `state=${userId}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`

    console.log("Generated auth URL successfully")
    return authUrl
  } catch (error) {
    console.error("getEtsyAuthUrl error:", error)
    throw error
  }
}

export async function exchangeCodeForToken(code: string, userId: string): Promise<EtsyTokens> {
  console.log("Exchanging code for token - userId:", userId)
  
  try {
    // Store'dan code verifier'ı al - örnekteki gibi
    const { data: authSession, error: sessionError } = await supabaseAdmin
    .from("etsy_auth_sessions")
    .select("code_verifier")
    .eq("user_id", userId)
    .single()

    if (sessionError || !authSession?.code_verifier) {
      console.error("Code verifier not found:", sessionError)
    throw new Error("Code verifier not found")
  }

    console.log("Found code verifier, making token request...")

    // Token isteği - örnekteki gibi
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
  })

  if (!response.ok) {
      const errorText = await response.text()
      console.error("Token exchange error:", response.status, errorText)
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`)
  }

  const tokens: EtsyTokens = await response.json()
    console.log("Token exchange successful")

    // Code verifier'ı temizle
    await supabaseAdmin
      .from("etsy_auth_sessions")
      .update({ code_verifier: null })
      .eq("user_id", userId)

    // Token'ları veritabanına kaydet - DEBUG bilgisi ekle
    console.log("Storing tokens for user_id:", userId)
    const tokenData = {
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      token_type: tokens.token_type || 'Bearer',
    created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    console.log("Token data to store:", { 
      user_id: tokenData.user_id, 
      expires_at: tokenData.expires_at,
      token_type: tokenData.token_type,
      access_token_length: tokenData.access_token.length,
      refresh_token_length: tokenData.refresh_token.length
    })

    const { data: insertedData, error: tokenError } = await supabaseAdmin
      .from("etsy_tokens")
      .upsert(tokenData)
      .select()

    if (tokenError) {
      console.error("Token storage error:", tokenError)
      throw new Error(`Failed to store tokens: ${tokenError.message}`)
    }

    console.log("Tokens stored successfully:", insertedData)
    
    // Verification: Token'ın gerçekten kaydedildiğini kontrol et
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from("etsy_tokens")
      .select("user_id, created_at, expires_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    
    if (verifyError) {
      console.error("Token verification failed:", verifyError)
    } else {
      console.log("Token verification successful:", verifyData)
    }

  return tokens

  } catch (error) {
    console.error("Token exchange error:", error)
    throw error
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
async function rateLimitedFetch<T>(
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
async function refreshEtsyToken(userId: string): Promise<string> {
  try {
    console.log("Refreshing Etsy token for user:", userId);
    
    const supabase = createClientSupabase();
    const { data: tokens, error } = await supabase
      .from('etsy_tokens')
      .select('refresh_token, expires_at, access_token')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error("Error fetching Etsy refresh token:", error);
      throw new Error('RECONNECT_REQUIRED');
    }

    if (!tokens || !tokens.refresh_token) {
      console.error("No refresh token found for user:", userId);
      throw new Error('RECONNECT_REQUIRED');
    }

    // Token hala geçerli mi kontrol et - 5 dakikalık bir tampon bırak
    if (tokens.expires_at && new Date(tokens.expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
      console.log("Token still valid, no need to refresh. Expires at:", tokens.expires_at);
      return tokens.access_token;
    }

    console.log("Token needs refresh. Current expiry:", tokens.expires_at);
    
    // Etsy API'ye token yenileme isteği gönder
    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: ETSY_CLIENT_ID,
        refresh_token: tokens.refresh_token,
      }),
    });

    if (!response.ok) {
      let errorText = '';
      try {
        const errorJson = await response.json();
        errorText = JSON.stringify(errorJson);
      } catch (e) {
        errorText = await response.text().catch(() => response.statusText);
      }

      console.error(`Token refresh failed: ${response.status} - ${errorText}`);

      // 400 ve 401 hata kodları için token yenileme gerektiğini belirt
      if (response.status === 400 || response.status === 401) {
        console.log("Invalid refresh token, user needs to reconnect");
        throw new Error('RECONNECT_REQUIRED');
      }

      // Diğer API hataları - yeniden bağlantı gerekiyorsa RECONNECT_REQUIRED mesajı döndürür
      if (errorText.includes('invalid_grant') || 
          errorText.includes('expired') || 
          errorText.includes('revoked')) {
        console.log("Token refresh failed with OAuth error, user needs to reconnect");
        throw new Error('RECONNECT_REQUIRED');
      }

      console.error("Token refresh failed, but existing token is still valid. Using existing token.");
      // Mevcut token'ı döndürerek bir şans daha ver
      if (tokens.access_token) {
        return tokens.access_token;
      }
      
      throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
    }

    const newTokens = await response.json();
    console.log("Token refreshed successfully. New expiry in", newTokens.expires_in, "seconds");

    // Yeni expire time hesapla (şu an + expires_in saniye)
    const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

    // Token'ları veritabanına kaydet
    const { error: updateError } = await supabase
      .from('etsy_tokens')
      .update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error("Error updating tokens in database:", updateError);
      // Kaydetme hatası olsa bile yeni token'ı döndür
    }

    return newTokens.access_token;
  } catch (error) {
    console.error("refreshEtsyToken error:", error);
    
    // RECONNECT_REQUIRED hatası veya diğer hataları yeniden fırlat
    if (error instanceof Error) {
      if (error.message === 'RECONNECT_REQUIRED') {
        throw error;
      }
      throw new Error(`Token refresh failed: ${error.message}`);
    }
    
    throw new Error('Unknown error refreshing token');
  }
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    console.log("Getting valid access token for user:", userId);
    
    const supabase = createClientSupabase();
    const { data: tokens, error } = await supabase
      .from('etsy_tokens')
      .select('access_token, refresh_token, expires_at, created_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error("Error fetching Etsy tokens:", error);
      return null;
    }

    if (!tokens || !tokens.access_token) {
      console.error("No access token found for user:", userId);
      return null;
    }

    // Debug için token bilgilerini yazdır
    console.log("Token found:", {
      expires_at: tokens.expires_at,
      created_at: tokens.created_at,
      access_token_length: tokens.access_token.length
    });

    // Token hala geçerli mi kontrol et - 5 dakikalık bir tampon bırak
    if (tokens.expires_at && new Date(tokens.expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
      console.log("Token still valid. Using existing token.");
      return tokens.access_token;
    }

    // Token süresi dolmuş, yenile
    console.log("Token expired or close to expiry. Refreshing...");
    return await refreshEtsyToken(userId);
  } catch (error) {
    // Yeniden bağlantı gereken hata
    if (error instanceof Error && error.message === 'RECONNECT_REQUIRED') {
      console.error("No valid access token for getEtsyStores - user needs to connect Etsy account");
      return null;
    }
    
    console.error("getValidAccessToken error:", error);
    return null;
  }
}

// Veritabanı yedekleme fonksiyonu
export async function getStoresFromDatabase(userId: string): Promise<EtsyStore[]> {
  console.log(`DEBUG: getStoresFromDatabase called for userId: ${userId}`);
  
  try {
    // This is where you would implement database access logic
    // For now, return an empty array
    return [];
  } catch (error) {
    console.error(`Error retrieving stores from database for user ${userId}:`, error);
    return [];
  }
}

// Veritabanına veri kaydetme fonksiyonu
async function storeEtsyData(userId: string, shopId: number, data: any, type: 'store' | 'listings' | 'stats' | 'receipts' | 'payments') {
  try {
    const tableName = `etsy_${type}_data`;
    const { error } = await supabaseAdmin
      .from(tableName)
      .upsert({
        user_id: userId,
        shop_id: shopId,
        data: data,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id,shop_id'
      });

    if (error) {
      console.error(`Error storing ${type} data:`, error);
      throw error;
    }

    // Önbelleğe de kaydet
    const cacheKey = `etsy_${type}_${userId}_${shopId}`;
    cacheManager.set(cacheKey, data, { ttl: 24 * 60 * 60 * 1000 }); // 24 saat

    console.log(`✅ Stored ${type} data for shop ${shopId}`);
  } catch (error) {
    console.error(`Failed to store ${type} data:`, error);
    throw error;
  }
}

// Veritabanından veri okuma fonksiyonu
async function getStoredEtsyData(userId: string, shopId: number, type: 'store' | 'listings' | 'stats' | 'receipts' | 'payments') {
  try {
    // Önce önbellekten kontrol et
    const cacheKey = `etsy_${type}_${userId}_${shopId}`;
    const cachedData = cacheManager.get(cacheKey);
    if (cachedData) {
      console.log(`📦 Using cached ${type} data`);
      return cachedData;
    }

    // Önbellekte yoksa veritabanından oku
    const tableName = `etsy_${type}_data`;
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('shop_id', shopId)
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error(`Error getting ${type} data:`, error);
      return null;
    }

    if (data) {
      // Veritabanından okunan veriyi önbelleğe al
      cacheManager.set(cacheKey, data.data, { ttl: 24 * 60 * 60 * 1000 }); // 24 saat
      return data.data;
    }

    return null;
  } catch (error) {
    console.error(`Failed to get ${type} data:`, error);
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

// getEtsyStores fonksiyonunu güncelle
export async function getEtsyStores(userId: string, skipCache = false): Promise<EtsyStore[]> {
  try {
    console.log("=== getEtsyStores called for userId:", userId, "===");

    // Mevcut token'ı kontrol et
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      console.error("No valid access token for getEtsyStores - user needs to connect Etsy account");
      return [];
    }

    try {
      // Etsy API'ye istek göndererek kullanıcının Etsy User ID'sini al
      // OAuth 2.0'da user ID token payload'ında genellikle bulunmaz,
      // bunun yerine /users/me endpoint'i kullanılır.
      console.log("Fetching Etsy User ID using access token...");
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

        // Diğer hatalar
        return [];
      }

      const userDetails: any = await userMeResponse.json();
      const etsyUserId = userDetails?.user_id;

      if (!etsyUserId) {
        console.error("Could not fetch Etsy User ID from /users/me endpoint response:", userDetails);
        return [];
      }

      console.log("Fetched Etsy User ID:", etsyUserId);
      console.log("Fetching shops for Etsy User ID:", etsyUserId);

      // Etsy API'ye istek gönder - kullanıcının mağazalarını al
      const response = await fetch(`${ETSY_API_BASE}/application/users/${etsyUserId}/shops`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': ETSY_CLIENT_ID
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        console.error(`Error fetching Etsy shops: ${response.status} - ${errorText}`);

        if (response.status === 401 || response.status === 403) {
          // Token geçersiz veya yetersiz izinler - yeniden bağlantı gerekli
          throw new Error('RECONNECT_REQUIRED');
        }

        // Diğer hatalar
        return [];
      }

      // API yanıtını al
      const responseText = await response.text();
      console.log("Raw API response from shops endpoint (first 300 chars):", responseText.substring(0, 300) + "...");

      // API yanıtını parse et
      let shopObj: any;
      try {
        shopObj = JSON.parse(responseText);
      } catch (e) {
        console.error("Error parsing Etsy shops response:", e);
        return [];
      }

      // API yanıtı yapısını kontrol et ve mağazaları işle
      let shops: EtsyStore[] = [];

      // Etsy API v3 shops endpoint'i genellikle 'results' içinde bir dizi döndürür
      if (shopObj && Array.isArray(shopObj.results)) {
          shops = shopObj.results.map((shop: any) => ({
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
              review_count: shop.review_count,
              review_average: shop.review_average,
              is_active: true, // API'den gelen mağaza aktif kabul edilebilir
              last_synced_at: new Date().toISOString(),
              avatar_url: shop.avatar_url || null
          }));
          console.log(`Found ${shops.length} shops in results array.`);

      } else if (shopObj && shopObj.shop_id) {
        // Nadiren, belki tek mağaza doğrudan nesne olarak dönebilir?
        console.warn("Received single shop object instead of results array:", shopObj);
         shops = [{
              shop_id: shopObj.shop_id,
              shop_name: shopObj.shop_name,
              title: shopObj.title,
              announcement: shopObj.announcement,
              currency_code: shopObj.currency_code,
              is_vacation: shopObj.is_vacation,
              listing_active_count: shopObj.listing_active_count,
              num_favorers: shopObj.num_favorers,
              url: shopObj.url,
              image_url_760x100: shopObj.image_url_760x100,
              review_count: shopObj.review_count,
              review_average: shopObj.review_average,
              is_active: true,
              last_synced_at: new Date().toISOString(),
              avatar_url: shopObj.avatar_url || null
         }];
         console.log("Processed single shop object.");

      } else {
        console.error("Unexpected API response structure for shops:", shopObj);
        return []; // Beklenmedik yanıt formatı
      }

      console.log(`Successfully fetched ${shops.length} Etsy stores.`);
      return shops;

    } catch (error) {
      // RECONNECT_REQUIRED hatasını yeniden fırlat
      if (error instanceof Error && error.message === 'RECONNECT_REQUIRED') {
        console.error("RECONNECT_REQUIRED error during getEtsyStores");
        throw error; // Ana fonksiyona hatayı bildir
      }

      console.error("Error in getEtsyStores API call:", error);
      return [];
    }

  } catch (error) {
    console.error("Top-level error in getEtsyStores:", error);

     // RECONNECT_REQUIRED hatasını yakala ve işle
    if (error instanceof Error && error.message === 'RECONNECT_REQUIRED') {
      console.warn("Etsy connection requires reconnection.");
       // Burada kullanıcıyı yeniden bağlantı akışına yönlendirecek bir işaret veya hata döndürebilirsiniz.
       // Örneğin, boş dizi döndürüp UI'da mesaj gösterebilirsiniz.
       // Veya özel bir hata objesi fırlatabilirsiniz.
       // Şu an için boş dizi döndürüyorum.
       return [];
    }

    // Diğer hatalarda boş dizi döndür
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
      
      // Tüm verileri paralel olarak çek ve kaydet
      await Promise.all([
        // Listings
        getEtsyListings(userId, primaryStore.shop_id, 100, 0, 'active', true)
          .then(({ listings }) => storeEtsyData(userId, primaryStore.shop_id, listings, 'listings')),
        
        // Stats
        getEtsyStats(userId, primaryStore.shop_id, true)
          .then(stats => storeEtsyData(userId, primaryStore.shop_id, stats, 'stats')),
        
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

// Etsy Ledger Entries API - Hesap hareketlerini çeker
export async function getEtsyLedgerEntries(
  userId: string,
  shopId: number,
  limit = 25,
  offset = 0,
  minCreated?: number,
  maxCreated?: number,
  skipCache = false
): Promise<{
  entries: EtsyLedgerEntry[]
  count: number
}> {
  const cacheKey = `etsy_ledger_${userId}_${shopId}_${limit}_${offset}_${minCreated || ''}_${maxCreated || ''}`;
  
  try {
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log(`📦 No valid access token for user ${userId} - generating mock ledger entries`);
      const mockData = generateMockLedgerEntries(limit, shopId);
      return mockData;
    }
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (minCreated) {
      params.append('min_created', minCreated.toString());
    }
    if (maxCreated) {
      params.append('max_created', maxCreated.toString());
    }
    
    const data = await fetchWithCache<{results: EtsyLedgerEntry[], count: number}>(
      `${ETSY_API_BASE}/application/shops/${shopId}/payment-account/ledger-entries?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": ETSY_CLIENT_ID,
        },
        cacheKey,
        skipCache,
        mockDataGenerator: () => {
          console.log(`📦 Generating mock ledger entries for shop ${shopId}`);
          return generateMockLedgerEntries(limit, shopId);
        }
      }
    );
    
    return {
      entries: data.results || [],
      count: data.count || 0
    };
  } catch (error) {
    console.error("getEtsyLedgerEntries error:", error);
    
    // Check if we have stale cached data
    const cachedData = cacheManager.get<{entries: EtsyLedgerEntry[], count: number}>(cacheKey);
    if (cachedData) {
      console.log(`📦 Using cached ledger entries after error: ${cachedData.entries.length} entries`);
      return cachedData;
    }
    
    // Gerçek veri yoksa boş dizi döndür
    return { entries: [], count: 0 };
  }
}

// Finansal özet hesaplama fonksiyonu
export async function calculateFinancialSummary(
  userId: string,
  shopId: number,
  days = 30,
  skipCache = false
): Promise<{
  totalRevenue: number
  totalOrders: number
  totalFees: number
  netRevenue: number
  averageOrderValue: number
  currency: string
}> {
  try {
    // Check cache first if skipCache is false
    if (!skipCache) {
      const cacheKey = `etsy_financial_summary_${userId}_${shopId}_${days}`;
      const cachedSummary = cacheManager.get<{
        totalRevenue: number;
        totalOrders: number;
        totalFees: number;
        netRevenue: number;
        averageOrderValue: number;
        currency: string;
      }>(cacheKey);
      
      if (cachedSummary) {
        console.log(`📦 Using cached financial summary data`);
        return cachedSummary;
      }
    }
    // Son 30 günün timestamp'i
    const thirtyDaysAgo = Math.floor((Date.now() - (days * 24 * 60 * 60 * 1000)) / 1000)
    
    // Payments ve receipts'i paralel olarak çek
    const [paymentsResult, receiptsResult] = await Promise.all([
      getEtsyPayments(userId, shopId, 100, 0),
      getEtsyReceipts(userId, shopId, 100, 0)
    ])

    const { payments } = paymentsResult
    const { receipts } = receiptsResult

    // Son 30 günün verilerini filtrele
    const recentPayments = payments.filter(payment => 
      payment.create_timestamp >= thirtyDaysAgo
    )
    
    const recentReceipts = receipts.filter(receipt => 
      receipt.create_timestamp >= thirtyDaysAgo && receipt.is_paid
    )

    // Finansal hesaplamalar
    let totalRevenue = 0
    let totalFees = 0
    let currency = 'USD'

    recentPayments.forEach(payment => {
      totalRevenue += payment.amount_gross.amount / payment.amount_gross.divisor
      totalFees += payment.amount_fees.amount / payment.amount_fees.divisor
      currency = payment.amount_gross.currency_code
    })

    const netRevenue = totalRevenue - totalFees
    const totalOrders = recentReceipts.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    const result = {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      totalFees: Math.round(totalFees * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      currency
    };
    
    // Cache the financial summary
    const cacheKey = `etsy_financial_summary_${userId}_${shopId}_${days}`;
    cacheManager.set(cacheKey, result);
    console.log(`📦 Cached financial summary data`);
    
    return result;
  } catch (error) {
    console.error("Error calculating financial summary:", error)
    // Hata durumunda boş veri döndür
    return {
      totalRevenue: 0,
      totalOrders: 0,
      totalFees: 0,
      netRevenue: 0,
      averageOrderValue: 0,
      currency: 'USD'
    }
  }
}

// ===== ETSY LISTING CRUD OPERATIONS =====

export interface CreateListingData {
  quantity: number
  title: string
  description: string
  price: number // USD cents (örn: 1000 = $10.00)
  who_made: "i_did" | "someone_else" | "collective"
  when_made: "made_to_order" | "2020_2024" | "2010_2019" | "2000_2009" | "1990s" | "1980s" | "1970s" | "1960s" | "1950s" | "1940s" | "1930s" | "1920s" | "1910s" | "1900s" | "1800s" | "1700s" | "before_1700"
  taxonomy_id: number
  shipping_profile_id?: number
  materials?: string[]
  tags?: string[]
  image_ids?: number[]
  is_digital?: boolean
  processing_min?: number
  processing_max?: number
}

export interface UpdateListingData {
  title?: string
  description?: string
  price?: number
  quantity?: number
  tags?: string[]
  materials?: string[]
  state?: "active" | "inactive" | "draft"
  shipping_profile_id?: number
  processing_min?: number
  processing_max?: number
  images_order?: number[] // Add this field to hold image ordering
}

// Yeni listing oluştur (draft olarak)
export async function createDraftListing(
  userId: string,
  shopId: number,
  listingData: CreateListingData
): Promise<EtsyListing> {
  const accessToken = await getValidAccessToken(userId)

  const formData = new URLSearchParams()
  formData.append('quantity', listingData.quantity.toString())
  formData.append('title', listingData.title)
  formData.append('description', listingData.description)
  formData.append('price', listingData.price.toString())
  formData.append('who_made', listingData.who_made)
  formData.append('when_made', listingData.when_made)
  formData.append('taxonomy_id', listingData.taxonomy_id.toString())

  if (listingData.shipping_profile_id) {
    formData.append('shipping_profile_id', listingData.shipping_profile_id.toString())
  }
  if (listingData.materials) {
    listingData.materials.forEach(material => formData.append('materials', material))
  }
  if (listingData.tags) {
    listingData.tags.forEach(tag => formData.append('tags', tag))
  }
  if (listingData.image_ids) {
    formData.append('image_ids', listingData.image_ids.join(','))
  }
  if (listingData.is_digital) {
    formData.append('is_digital', 'true')
  }
  if (listingData.processing_min) {
    formData.append('processing_min', listingData.processing_min.toString())
  }
  if (listingData.processing_max) {
    formData.append('processing_max', listingData.processing_max.toString())
  }

  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/listings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": ETSY_CLIENT_ID,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Create listing error:", errorData)
    throw new Error(`Failed to create listing: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return data
}

// Listing güncelle
export async function updateListing(
  userId: string,
  shopId: number,
  listingId: number,
  updateData: UpdateListingData
): Promise<EtsyListing> {
  console.log(`[updateListing] Starting update for listing ${listingId} with data:`, JSON.stringify(updateData, null, 2));
  const accessToken = await getValidAccessToken(userId);
  console.log(`[updateListing] Got valid access token for user ${userId}`);

  // Check if we have a quantity to update
  const hasQuantityUpdate = updateData.quantity !== undefined;
  const requestedQuantity = hasQuantityUpdate ? Number(updateData.quantity) : undefined;
  
  // If we're updating quantity, we need to handle it separately with the inventory endpoint
  if (hasQuantityUpdate && requestedQuantity !== undefined) {
    console.log(`[updateListing] Will update quantity to ${requestedQuantity} (${typeof requestedQuantity})`);
    
    try {
      // First update inventory with the dedicated inventory endpoint
      const inventoryResponse = await fetch(
        `https://api.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/inventory`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'x-api-key': ETSY_CLIENT_ID
          },
          body: JSON.stringify({
            products: [
              {
                sku: '',
                property_values: [],
                offerings: [
                  {
                    price: updateData.price ? updateData.price / 100 : undefined,
                    quantity: requestedQuantity,
                    is_enabled: true
                  }
                ]
              }
            ]
          })
        }
      );
      
      if (!inventoryResponse.ok) {
        console.log(`[updateListing] Inventory update failed with status ${inventoryResponse.status}. Will try standard update instead.`);
        // If inventory update failed, we'll still try the standard update below
      } else {
        console.log(`[updateListing] Inventory update successful for listing ${listingId} - quantity set to ${requestedQuantity}`);
      }
    } catch (inventoryError) {
      console.error(`[updateListing] Error updating inventory for listing ${listingId}:`, inventoryError);
      // Continue with standard update below
    }
  }

  // Standard update with other fields
  const formData = new URLSearchParams();
  
  if (updateData.title) formData.append('title', updateData.title);
  if (updateData.description) formData.append('description', updateData.description);
  if (updateData.price) formData.append('price', updateData.price.toString());
  if (hasQuantityUpdate) formData.append('quantity', requestedQuantity!.toString());
  if (updateData.state) formData.append('state', updateData.state);
  
  console.log(`[updateListing] Prepared form data:`, Array.from(formData.entries()));
  
  // Make the request to update the listing
  const url = `https://api.etsy.com/v3/application/shops/${shopId}/listings/${listingId}`;
  console.log(`[updateListing] Sending PATCH request to: ${url}`);
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-api-key': ETSY_CLIENT_ID
    },
    body: formData
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error(`[updateListing] Error updating listing ${listingId}:`, errorData);
    throw new Error(`Failed to update listing: ${JSON.stringify(errorData)}`);
  }
  
  const updatedListing = await response.json();
  console.log(`[updateListing] Successfully updated listing ${listingId}. Response:`, updatedListing);
  
  // If there's a mismatch between the requested quantity and the response quantity,
  // try one more direct inventory update
  if (
    hasQuantityUpdate && 
    requestedQuantity !== undefined && 
    updatedListing.quantity !== requestedQuantity
  ) {
    console.log(`[updateListing] Quantity mismatch: requested=${requestedQuantity}, got=${updatedListing.quantity}. Trying direct update.`);
    
    try {
      // Get product ID for the main variation (if any)
      const inventoryUrl = `https://api.etsy.com/v3/application/listings/${listingId}/inventory`;
      const inventoryResponse = await fetch(inventoryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': ETSY_CLIENT_ID
        }
      });
      
      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        console.log(`[updateListing] Got inventory data for forceful quantity update:`, JSON.stringify(inventoryData, null, 2));
        
        // Create an updated inventory payload based on existing data
        // Handle variations by updating only specific required fields
        const updatePayload = {
          products: inventoryData.products.map((product: any) => ({
            product_id: product.product_id, // Keep this for reference only
            sku: product.sku || "",
            property_values: product.property_values || [],
            offerings: product.offerings.map((offering: any) => ({
              offering_id: offering.offering_id, // Keep this for reference only
              quantity: requestedQuantity,
              is_enabled: true,
              price: offering.price
            }))
          }))
        };
        
        // Remove fields that Etsy API doesn't accept in the PUT request
        const cleanPayload = {
          products: updatePayload.products.map((product: any) => {
            const { product_id, is_deleted, ...cleanProduct } = product;
            return {
              ...cleanProduct,
              property_values: product.property_values.map((propValue: any) => {
                // Remove scale_name field if it exists to avoid API error
                const { scale_name, ...cleanPropValue } = propValue;
                return cleanPropValue;
              }),
              offerings: product.offerings.map((offering: any) => {
                const { offering_id, is_deleted, ...cleanOffering } = offering;
                
                // Ensure price is properly formatted as a number instead of an object
                if (offering.price && typeof offering.price === 'object' && offering.price.amount !== undefined) {
                  return {
                    ...cleanOffering,
                    price: offering.price.amount / offering.price.divisor,
                    quantity: requestedQuantity
                  };
                }
                
                return {
                  ...cleanOffering,
                  quantity: requestedQuantity
                };
              })
            };
          }),
          price_on_property: inventoryData.price_on_property,
          quantity_on_property: inventoryData.quantity_on_property,
          sku_on_property: inventoryData.sku_on_property
        };
        
        console.log(`[updateListing] Prepared clean inventory payload:`, JSON.stringify(cleanPayload, null, 2));
        
        // Update inventory with correct quantity
        const updateResponse = await fetch(inventoryUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'x-api-key': ETSY_CLIENT_ID
          },
          body: JSON.stringify(cleanPayload)
        });
        
        if (updateResponse.ok) {
          console.log(`[updateListing] Force-updated quantity to ${requestedQuantity}`);
          updatedListing.quantity = requestedQuantity;
        } else {
          const errorResponse = await updateResponse.json();
          console.error(`[updateListing] Failed to force-update quantity:`, errorResponse);
        }
      }
    } catch (forceUpdateError) {
      console.error(`[updateListing] Error in force-update of quantity:`, forceUpdateError);
    }
  }
  
  // Invalidate the cache for this listing's shop
  try {
    invalidateShopCache(userId, shopId);
    console.log(`[updateListing] Invalidated cache for shop ${shopId}`);
  } catch (cacheError) {
    console.error(`[updateListing] Error invalidating cache:`, cacheError);
  }
  
  return updatedListing;
}

// Listing sil
export async function deleteListing(
  userId: string,
  listingId: number
): Promise<void> {
  const accessToken = await getValidAccessToken(userId)

  const response = await fetch(`${ETSY_API_BASE}/application/listings/${listingId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": ETSY_CLIENT_ID,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Delete listing error:", errorData)
    throw new Error(`Failed to delete listing: ${errorData.error || response.statusText}`)
  }
}

// Listing'e resim yükle
export async function uploadListingImage(
  userId: string,
  shopId: number,
  listingId: number,
  imageFile: File | Buffer,
  filename?: string
): Promise<any> {
  const accessToken = await getValidAccessToken(userId)

  const formData = new FormData()
  
  if (imageFile instanceof File) {
    formData.append('image', imageFile)
  } else {
    // Buffer için
    const blob = new Blob([imageFile])
    formData.append('image', blob, filename || 'image.jpg')
  }

  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}/images`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": ETSY_CLIENT_ID,
    },
    body: formData
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Upload image error:", errorData)
    throw new Error(`Failed to upload image: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return data
}

// ===== SHOP MANAGEMENT =====

export interface UpdateShopData {
  title?: string
  announcement?: string
  sale_message?: string
  digital_sale_message?: string
}

// Shop bilgilerini güncelle
export async function updateShop(
  userId: string,
  shopId: number,
  updateData: UpdateShopData
): Promise<EtsyStore> {
  const accessToken = await getValidAccessToken(userId)

  const formData = new URLSearchParams()
  
  if (updateData.title) formData.append('title', updateData.title)
  if (updateData.announcement) formData.append('announcement', updateData.announcement)
  if (updateData.sale_message) formData.append('sale_message', updateData.sale_message)
  if (updateData.digital_sale_message) formData.append('digital_sale_message', updateData.digital_sale_message)

  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": ETSY_CLIENT_ID,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Update shop error:", errorData)
    throw new Error(`Failed to update shop: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return data
}

// ===== SHOP SECTIONS =====

export interface ShopSection {
  shop_section_id: number
  title: string
  rank: number
  user_id: number
  active_listing_count: number
}

// Shop section oluştur
export async function createShopSection(
  userId: string,
  shopId: number,
  title: string
): Promise<ShopSection> {
  const accessToken = await getValidAccessToken(userId)

  const formData = new URLSearchParams()
  formData.append('title', title)

  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/sections`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": ETSY_CLIENT_ID,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Create section error:", errorData)
    throw new Error(`Failed to create section: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return data
}

// Shop section'ları listele
export async function getShopSections(
  userId: string,
  shopId: number
): Promise<ShopSection[]> {
  const accessToken = await getValidAccessToken(userId)

  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/sections`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": ETSY_CLIENT_ID,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Get sections error:", errorData)
    throw new Error(`Failed to get sections: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return data.results || []
}

// ===== SHIPPING PROFILES =====

export interface ShippingProfile {
  shipping_profile_id: number
  title: string
  user_id: number
  min_processing_time: number
  max_processing_time: number
  processing_time_unit: string
  origin_country_iso: string
}

export interface CreateShippingProfileData {
  title: string
  origin_country_iso: string
  primary_cost: number
  secondary_cost: number
  min_processing_time: number
  max_processing_time: number
  destination_country_iso?: string
  destination_region?: "eu" | "non_eu" | "none"
}

// Shipping profile oluştur
export async function createShippingProfile(
  userId: string,
  shopId: number,
  profileData: CreateShippingProfileData
): Promise<ShippingProfile> {
  const accessToken = await getValidAccessToken(userId)

  const formData = new URLSearchParams()
  formData.append('title', profileData.title)
  formData.append('origin_country_iso', profileData.origin_country_iso)
  formData.append('primary_cost', profileData.primary_cost.toString())
  formData.append('secondary_cost', profileData.secondary_cost.toString())
  formData.append('min_processing_time', profileData.min_processing_time.toString())
  formData.append('max_processing_time', profileData.max_processing_time.toString())

  if (profileData.destination_country_iso) {
    formData.append('destination_country_iso', profileData.destination_country_iso)
  }
  if (profileData.destination_region) {
    formData.append('destination_region', profileData.destination_region)
  }

  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/shipping-profiles`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": ETSY_CLIENT_ID,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Create shipping profile error:", errorData)
    throw new Error(`Failed to create shipping profile: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return data
}

// Shipping profile'ları listele
export async function getShippingProfiles(
  userId: string,
  shopId: number
): Promise<ShippingProfile[]> {
  const accessToken = await getValidAccessToken(userId)

  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/shipping-profiles`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": ETSY_CLIENT_ID,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Get shipping profiles error:", errorData)
    throw new Error(`Failed to get shipping profiles: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return data.results || []
}

// ===== TAXONOMY & PROPERTIES =====

export interface TaxonomyNode {
  id: number
  level: number
  name: string
  parent_id?: number
  path: string[]
  children?: TaxonomyNode[]
}

export interface Property {
  property_id: number
  name: string
  display_name: string
  scales?: PropertyScale[]
  possible_values?: PropertyValue[]
}

export interface PropertyScale {
  scale_id: number
  display_name: string
  description: string
}

export interface PropertyValue {
  value_id: number
  name: string
  scale_id?: number
}

// Seller taxonomy node'larını getir
export async function getSellerTaxonomyNodes(): Promise<TaxonomyNode[]> {
  const response = await fetch(`${ETSY_API_BASE}/application/seller-taxonomy/nodes`, {
    headers: {
      "x-api-key": ETSY_CLIENT_ID,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Get taxonomy error:", errorData)
    throw new Error(`Failed to get taxonomy: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return data.results || []
}

// Taxonomy ID'ye göre property'leri getir
export async function getPropertiesByTaxonomyId(taxonomyId: number): Promise<Property[]> {
  const response = await fetch(`${ETSY_API_BASE}/application/seller-taxonomy/nodes/${taxonomyId}/properties`, {
    headers: {
      "x-api-key": ETSY_CLIENT_ID,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Get properties error:", errorData)
    throw new Error(`Failed to get properties: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return data.results || []
}

/**
 * Invalidates all cached data for a specific user
 */
export function invalidateUserCache(userId: string): void {
  console.log(`Invalidating cache for user: ${userId}`);
  cacheManager.invalidateByPrefix(`etsy_stores_${userId}`);
  cacheManager.invalidateByPrefix(`etsy_listings_${userId}`);
  cacheManager.invalidateByPrefix(`etsy_receipts_${userId}`);
  cacheManager.invalidateByPrefix(`etsy_payments_${userId}`);
  cacheManager.invalidateByPrefix(`etsy_financial_summary_${userId}`);
  console.log(`Cache invalidated for user: ${userId}`);
}

/**
 * Invalidates cached data for a specific shop
 */
export function invalidateShopCache(userId: string, shopId: number): void {
  console.log(`Invalidating shop cache for user: ${userId}, shop: ${shopId}`);
  cacheManager.invalidateByPrefix(`etsy_listings_${userId}_${shopId}`);
  cacheManager.invalidateByPrefix(`etsy_receipts_${userId}_${shopId}`);
  cacheManager.invalidateByPrefix(`etsy_payments_${userId}_${shopId}`);
  cacheManager.invalidateByPrefix(`etsy_financial_summary_${userId}_${shopId}`);
  console.log(`Shop cache invalidated for user: ${userId}, shop: ${shopId}`);
}

/**
 * Utility function to get fresh data or use cache based on preference
 */
export async function getEtsyStoresWithCacheControl(
  userId: string, 
  { forceRefresh = false, cacheTime = 3 * 60 * 60 * 1000 } = {}
): Promise<EtsyStore[]> {
  const stores = await getEtsyStores(userId, forceRefresh);
  
  // If we forced a refresh, update the cache expiration
  if (forceRefresh && stores.length > 0) {
    const cacheKey = `etsy_stores_${userId}`;
    cacheManager.set(cacheKey, stores, { ttl: cacheTime });
    console.log(`Updated cache TTL for stores to ${cacheTime / (60 * 1000)} minutes`);
  }
  
  return stores;
}

/**
 * Utility function to get fresh listings or use cache based on preference
 */
export async function getEtsyListingsWithCacheControl(
  userId: string,
  shopId: number,
  { 
    limit = 25, 
    offset = 0, 
    state = 'active' as 'active' | 'inactive' | 'draft' | 'expired' | 'all',
    forceRefresh = false,
    cacheTime = 3 * 60 * 60 * 1000
  } = {}
): Promise<{
  listings: EtsyListing[]
  count: number
}> {
  const result = await getEtsyListings(userId, shopId, limit, offset, state, forceRefresh);
  
  // If we forced a refresh, update the cache expiration
  if (forceRefresh && result.listings.length > 0) {
    const cacheKey = `etsy_listings_${userId}_${shopId}_${limit}_${offset}_${state}`;
    cacheManager.set(cacheKey, result, { ttl: cacheTime });
    console.log(`Updated cache TTL for listings to ${cacheTime / (60 * 1000)} minutes`);
  }
  
  return result;
}

/**
 * Get all Etsy data for a user with refresh control
 * This function is used to refresh all cached data for a user
 */
export async function getEtsyDataWithRefreshControl(
  userId: string,
  shopId?: number,
  forceRefresh: boolean = false
): Promise<{
  success: boolean;
  message: string;
  stores?: EtsyStore[];
  timestamp: number;
}> {
  try {
    console.log(`Refreshing Etsy data for user: ${userId}, force: ${forceRefresh}`);
    
    // Mağaza belirtilmişse sadece o mağazaya ait verileri temizle
    if (shopId) {
      if (forceRefresh) {
        invalidateShopCache(userId, shopId);
      }
      
      // Mağaza verilerini çek
      const storeData = await getEtsyListingsWithCacheControl(
        userId, 
        shopId, 
        { forceRefresh, limit: 10 }
      );
      
      return {
        success: true,
        message: `Mağaza verileri ${forceRefresh ? 'yenilendi' : 'önbellekten yüklendi'}`,
        timestamp: Date.now()
      };
    }
    
    // Belirli bir mağaza belirtilmemişse tüm kullanıcı verilerini yenile
    if (forceRefresh) {
      invalidateUserCache(userId);
    }
    
    // Mağazaları çek
    const stores = await getEtsyStoresWithCacheControl(
      userId, 
      { forceRefresh }
    );
    
    // Her mağazanın verilerini çek
    if (stores && stores.length > 0) {
      // Sadece ilk mağazanın verilerini çekelim (çok sayıda istek yapılmasını önlemek için)
      const firstShopId = stores[0].shop_id;
      
      await Promise.all([
        getEtsyListingsWithCacheControl(userId, firstShopId, { forceRefresh, limit: 5 }),
        // Diğer API çağrıları da eklenebilir
      ]);
    }
    
    return {
      success: true,
      message: forceRefresh 
        ? 'Tüm Etsy verileri başarıyla yenilendi' 
        : 'Mevcut önbellek verileri kullanıldı',
      stores,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error refreshing Etsy data:', error);
    return {
      success: false,
      message: `Veri yenileme hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
      timestamp: Date.now()
    };
  }
}

// Veritabanı tablolarını oluştur
export async function createEtsyDataTables(): Promise<void> {
  try {
    console.log("Creating Etsy data tables...");

    // Mağaza verileri tablosu
    const { error: storeError } = await supabaseAdmin.rpc('create_etsy_store_data_table');
    if (storeError) {
      console.error("Error creating store data table:", storeError);
      throw storeError;
    }

    // Ürün listeleri tablosu
    const { error: listingsError } = await supabaseAdmin.rpc('create_etsy_listings_data_table');
    if (listingsError) {
      console.error("Error creating listings data table:", listingsError);
      throw listingsError;
    }

    // Mağaza istatistikleri tablosu
    const { error: statsError } = await supabaseAdmin.rpc('create_etsy_stats_data_table');
    if (statsError) {
      console.error("Error creating stats data table:", statsError);
      throw statsError;
    }

    // Siparişler tablosu
    const { error: receiptsError } = await supabaseAdmin.rpc('create_etsy_receipts_data_table');
    if (receiptsError) {
      console.error("Error creating receipts data table:", receiptsError);
      throw receiptsError;
    }

    // Ödemeler tablosu
    const { error: paymentsError } = await supabaseAdmin.rpc('create_etsy_payments_data_table');
    if (paymentsError) {
      console.error("Error creating payments data table:", paymentsError);
      throw paymentsError;
    }

    console.log("✅ All Etsy data tables created successfully");
  } catch (error) {
    console.error("Failed to create Etsy data tables:", error);
    throw error;
  }
}

// Etsy mağaza istatistiklerini getir
export async function getEtsyStats(
  userId: string,
  shopId: number,
  skipCache = false
): Promise<{
  totalListings: number;
  totalOrders: number;
  totalViews: number;
  totalRevenue: number;
}> {
  const cacheKey = `etsy_stats_${userId}_${shopId}`;
  
  try {
    // Önce önbellekten kontrol et
    if (!skipCache) {
      const cachedStats = cacheManager.get<{
        totalListings: number;
        totalOrders: number;
        totalViews: number;
        totalRevenue: number;
      }>(cacheKey);
      
      if (cachedStats) {
        console.log(`📦 Using cached stats data`);
        return cachedStats;
      }
    }

    // Etsy mağazalarını çek
    const stores = await getEtsyStores(userId, skipCache);
    
    if (stores && stores.length > 0) {
      // Eğer shopId belirtilmişse o mağazayı bul, değilse ilkini kullan
      const store = shopId ? 
        stores.find(s => s.shop_id === shopId) : 
        stores[0];
      
      if (store) {
        // İstatistikleri hesapla
        const stats = {
          totalListings: store.listing_active_count || 0,
          totalOrders: store.review_count || 0, // Review count'u order sayısı olarak kullan
          totalViews: store.num_favorers * 100 || 0, // Tahmini
          totalRevenue: (store.review_count || 0) * 25.99, // Ortalama fiyat
        };
        
        // Önbelleğe kaydet
        cacheManager.set(cacheKey, stats, { ttl: 3 * 60 * 60 * 1000 }); // 3 saat
        
        return stats;
      }
    }
    
    // Veri yoksa boş değerler döndür
    return {
      totalListings: 0,
      totalOrders: 0,
      totalViews: 0,
      totalRevenue: 0
    };
  } catch (error) {
    console.error("getEtsyStats error:", error);
    
    // Hata durumunda varsayılan değerler
    return {
      totalListings: 0,
      totalOrders: 0,
      totalViews: 0,
      totalRevenue: 0
    };
  }
}

// New function to reorder listing images
export async function reorderListingImages(
  userId: string,
  shopId: number, // bu parametre kullanılmayacak
  listingId: number,
  imageIds: number[]
): Promise<boolean> {
  try {
    console.log(`[reorderListingImages] Starting reordering of images for listing ${listingId}`);
    
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      console.error("[reorderListingImages] No valid access token for reordering images");
      return false;
    }

    // Filter out any invalid IDs
    const validImageIds = imageIds.filter(id => typeof id === 'number' && !isNaN(id) && id > 0);
    if (validImageIds.length === 0) {
      console.error("[reorderListingImages] No valid image IDs after filtering:", imageIds);
      return false;
    }
    
    // Doğru Etsy API endpointi
    const url = `https://api.etsy.com/v3/application/listings/${listingId}/images`;
    const requestBody = {
      image_ids: validImageIds
    };
    
    console.log(`[reorderListingImages] Sending PUT request to: ${url}`);
    console.log(`[reorderListingImages] Request body:`, JSON.stringify(requestBody));
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-api-key': ETSY_CLIENT_ID,
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const responseStatus = response.status;
      let responseText = '';
      try {
        responseText = await response.text();
        console.log(`[reorderListingImages] Response text: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
      } catch (textError) {
        console.error(`[reorderListingImages] Error getting response text:`, textError);
      }
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = responseText ? JSON.parse(responseText) : { error: `HTTP error: ${responseStatus}` };
        } catch (e) {
          errorData = { error: responseText || `HTTP error: ${responseStatus}` };
        }
        console.error(`[reorderListingImages] Error reordering images for listing ${listingId}:`, errorData);
        return false;
      }
      
      try {
        const responseData = responseText ? JSON.parse(responseText) : {};
        console.log(`[reorderListingImages] API response:`, responseData);
      } catch (e) {}
      
      console.log(`[reorderListingImages] Successfully reordered images for listing ${listingId}`);
      return true;
    } catch (fetchError) {
      console.error(`[reorderListingImages] Fetch error while reordering:`, fetchError);
      return false;
    }
  } catch (error) {
    console.error(`[reorderListingImages] Exception reordering images for listing ${listingId}:`, error);
    return false;
  }
}

// Supabase client
function createClientSupabase() {
  return createClientComponentClient<Database>();
}
