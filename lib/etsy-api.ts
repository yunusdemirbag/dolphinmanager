import crypto from "crypto"
import qs from "querystring"
import { supabaseAdmin } from "./supabase"
import { createClient } from "@/lib/supabase/server"; // Import the server-side client
import { cacheManager } from "./cache"
import { fetchWithCache } from "./api-utils"
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

    // Fazla tokenları temizle
    await cleanupDuplicateTokens(userId);

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
    
    const supabase = await createClient(); // Use the server-side client
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

export async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    console.log("Getting valid access token for user:", userId);
    
    const supabase = await createClient(); // Use the server-side client
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
      access_token_length: tokens.access_token.length,
      access_token_prefix: tokens.access_token.substring(0, 10) + '...',
      token_type: tokens.access_token.startsWith('v3_') ? 'OAuth2' : 'OAuth1',
    });

    // Token'ın türünü kontrol etme ve RECONNECT_REQUIRED fırlatma kodunu kaldırdım
    // if (!tokens.access_token.startsWith('v3_')) {
    //   console.error("OAuth1 token detected. Need to migrate to OAuth2.");
    //   throw new Error('RECONNECT_REQUIRED');
    // }

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
export async function getSellerTaxonomyNodes(): Promise<any[]> {
  try {
    const response = await fetch(`${ETSY_API_BASE}/application/seller-taxonomy/nodes`, {
        headers: {
        'x-api-key': ETSY_CLIENT_ID,
      }
    });

    if (!response.ok) {
      throw new Error(`Taxonomy node'ları alınamadı: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Taxonomy node'ları alınırken hata oluştu:", error);
    return [];
  }
}

export async function getPropertiesByTaxonomyId(taxonomyId: number): Promise<any[]> {
  try {
    const response = await fetch(`${ETSY_API_BASE}/application/seller-taxonomy/nodes/${taxonomyId}/properties`, {
    headers: {
        'x-api-key': ETSY_CLIENT_ID,
      }
  });
  
  if (!response.ok) {
      throw new Error(`Taxonomy özellikleri alınamadı: ${response.status} ${response.statusText}`);
  }
  
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Taxonomy özellikleri alınırken hata oluştu:", error);
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
    console.log(`Fetching shipping profiles for user ${userId} and shop ${shopId}...`);
    
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log(`No valid access token for user ${userId} - cannot fetch shipping profiles`);
      throw new Error('RECONNECT_REQUIRED');
    }

    console.log('Making request to Etsy API for shipping profiles...');
    const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/shipping-profiles`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-api-key': ETSY_CLIENT_ID
      }
    });

    // Log the response status and headers for debugging
    console.log('Shipping profiles API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
  });
  
  if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from Etsy API:', errorText);
      
      if (response.status === 401) {
        throw new Error('RECONNECT_REQUIRED');
      }
      
      throw new Error(`Failed to fetch shipping profiles: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
    const responseText = await response.text();
    console.log('Raw API response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error('Invalid JSON response from Etsy API');
    }

    if (!data || !data.results || !Array.isArray(data.results)) {
      console.error('Invalid API response format:', data);
      throw new Error('Invalid API response format');
    }

    // Transform the response to match our interface
    const profiles = data.results.map((profile: any) => ({
      shipping_profile_id: profile.shipping_profile_id,
      title: profile.title,
      user_id: profile.user_id,
      min_processing_days: profile.min_processing_days,
      max_processing_days: profile.max_processing_days,
      processing_days_display_label: profile.processing_days_display_label,
      origin_country_iso: profile.origin_country_iso,
      is_deleted: profile.is_deleted || false,
      shipping_carrier_id: profile.shipping_carrier_id,
      mail_class: profile.mail_class,
      min_delivery_days: profile.min_delivery_days,
      max_delivery_days: profile.max_delivery_days,
      destination_country_iso: profile.destination_country_iso,
      destination_region: profile.destination_region,
      primary_cost: {
        amount: profile.primary_cost?.amount || 0,
        divisor: profile.primary_cost?.divisor || 100,
        currency_code: profile.primary_cost?.currency_code || 'USD'
      },
      secondary_cost: {
        amount: profile.secondary_cost?.amount || 0,
        divisor: profile.secondary_cost?.divisor || 100,
        currency_code: profile.secondary_cost?.currency_code || 'USD'
      }
    }));

    console.log(`Successfully fetched ${profiles.length} shipping profiles`);
    return profiles;
  } catch (error) {
    console.error('Error in getShippingProfiles:', error);
    
    // RECONNECT_REQUIRED hatasını yeniden fırlat
    if (error instanceof Error && error.message === 'RECONNECT_REQUIRED') {
      throw error;
    }
    
    // Diğer hataları yeniden fırlat
    throw error;
  }
}

// Get processing profiles for a shop
export async function getProcessingProfiles(userId: string, shopId: number): Promise<EtsyProcessingProfile[]> {
  try {
    console.log(`Fetching processing profiles for user ${userId} and shop ${shopId}...`);
    
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log(`No valid access token for user ${userId} - cannot fetch processing profiles`);
      throw new Error('RECONNECT_REQUIRED');
    }

    console.log('Making request to Etsy API for processing profiles...');
    // Etsy'nin API'si processing profile için production-partners endpoint'ini kullanıyor
    const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/production-partners`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': ETSY_CLIENT_ID
      }
    });

    // Log the response status and headers for debugging
    console.log('Processing profiles API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from Etsy API:', errorText);
      
      if (response.status === 401) {
        throw new Error('RECONNECT_REQUIRED');
      }
      
      throw new Error(`Failed to fetch processing profiles: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Raw API response for processing profiles:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error('Invalid JSON response from Etsy API');
    }

    if (!data || !data.results || !Array.isArray(data.results)) {
      console.error('Invalid API response format:', data);
      throw new Error('Invalid API response format');
    }

    // Etsy API'sinden gelen sonucu EtsyProcessingProfile formatına dönüştür
    const profiles = data.results.map((profile: any) => ({
      processing_profile_id: profile.production_partner_id,
      title: profile.partner_name,
      user_id: profile.user_id || 0,
      min_processing_days: 1, // Varsayılan değerler
      max_processing_days: 3, // Varsayılan değerler
      processing_days_display_label: '1-3 days', // Varsayılan değer
      is_deleted: false
    }));

    console.log(`Successfully fetched ${profiles.length} processing profiles`);
    return profiles;
  } catch (error) {
    console.error('Error in getProcessingProfiles:', error);
    
    // RECONNECT_REQUIRED hatasını yeniden fırlat
    if (error instanceof Error && error.message === 'RECONNECT_REQUIRED') {
      throw error;
    }
    
    // Boş dizi döndür
    return [];
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

// Create a draft listing on Etsy
export async function createDraftListing(accessToken: string, shopId: number, data: any): Promise<any> {
    const body = new URLSearchParams();
    
    // --- ⭐️⭐️⭐️ FİYAT HESAPLAMA MANTIĞI DÜZELTMESİ ⭐️⭐️⭐️ ---
    let finalPrice = 0;
    if (data.variations && data.variations.length > 0) {
        // Aktif ve fiyatı 0'dan büyük olan varyasyonları bul
        const validPrices = data.variations
            .filter((v: any) => v.is_active && typeof v.price === 'number' && v.price > 0)
            .map((v: any) => v.price);

        if (validPrices.length > 0) {
            // Geçerli fiyatlar arasından en düşüğünü al
            finalPrice = Math.min(...validPrices);
            body.append('has_variations', 'true');
            console.log(`[ETSY_API] Varyasyonlardan en düşük fiyat: ${finalPrice}`);
        } else {
            // Eğer geçerli bir varyasyon fiyatı yoksa, ana fiyatı kullan
            finalPrice = data.price || 0;
            body.append('has_variations', 'false');
            console.log(`[ETSY_API] Geçerli varyasyon fiyatı bulunamadı, ana fiyat kullanılıyor: ${finalPrice}`);
        }
    } else {
        // Hiç varyasyon yoksa direkt ana fiyatı kullan
        finalPrice = data.price || 0;
        body.append('has_variations', 'false');
        console.log(`[ETSY_API] Varyasyon yok, ana fiyat kullanılıyor: ${finalPrice}`);
    }
    
    // Fiyatın 0 olmadığından emin ol
    if (finalPrice <= 0) {
        console.error('[ETSY_API] Geçersiz fiyat:', finalPrice);
        throw new Error("Geçerli bir fiyat bulunamadı. Fiyat 0'dan büyük olmalıdır.");
    }

    // Fiyatı cents olarak gönder
    body.append('price', (finalPrice * 100).toString());
    console.log(`[ETSY_API] Etsy'ye gönderilecek fiyat (cents): ${finalPrice * 100}`);
    // -----------------------------------------------------------

    // Temel Bilgiler
    body.append('title', data.title);
    body.append('description', data.description);
    body.append('quantity', data.quantity.toString());
    body.append('shipping_profile_id', data.shipping_profile_id.toString());
    body.append('state', 'draft');
    
    // Zorunlu alanlar
    body.append('who_made', 'i_did');
    body.append('when_made', 'made_to_order');
    body.append('taxonomy_id', data.taxonomy_id ? data.taxonomy_id.toString() : '1366'); // Varsayılan Wall Decor
    
    // Shop Section ID'yi sadece geçerliyse ekle
    const sectionId = Number(data.shop_section_id);
    if (sectionId && sectionId > 0) {
        body.append('shop_section_id', sectionId.toString());
        console.log(`[ETSY_API] Ürün, dükkan bölümü ${sectionId}'e eklenecek.`);
    } else {
        console.log(`[ETSY_API] Dükkan bölümü belirtilmedi, ürün ana sayfada yer alacak.`);
    }

    // Diğer parametreler
    const fixedMaterials = ['Cotton Canvas', 'Wood Frame', 'Hanger'];
    fixedMaterials.forEach(material => {
        body.append('materials[]', material);
    });
    
    console.log("[ETSY_API] Etsy'ye gönderilen son istek gövdesi:", Object.fromEntries(body.entries()));

    const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/listings`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-api-key': ETSY_CLIENT_ID
        },
        body: body
    });

    const responseData = await response.json();
    if (!response.ok) {
        console.error("[ETSY_API] DRAFT CREATE ERROR:", responseData);
        // Hata mesajını daha okunabilir yap
        const errorMessage = typeof responseData.error === 'object' ? JSON.stringify(responseData.error) : responseData.error;
        throw new Error(errorMessage || 'Etsy ürün taslağı oluşturulamadı.');
    }
    
    return responseData;
}

// ⭐️⭐️⭐️ BU SEFER KESİN ÇALIŞACAK addInventoryWithVariations ⭐️⭐️⭐️
export async function addInventoryWithVariations(accessToken: string, listingId: number, variations: any[]): Promise<void> {
    console.log(`[ETSY_API] Envanter ve Varyasyonlar ekleniyor: Listing ID ${listingId}`);

    // 1. Benzersiz boyut ve desenleri al
    const uniqueSizes = Array.from(new Set(variations.map(v => v.size)));
    const uniquePatterns = Array.from(new Set(variations.map(v => v.pattern)));
    console.log(`[ETSY_API] Bulunan Benzersiz Değerler: ${uniqueSizes.length} boyut, ${uniquePatterns.length} desen`);

    // 2. Aktif olan varyasyonları kolayca bulmak için bir harita oluştur.
    const activeCombos = new Map(variations.filter(v => v.is_active).map(v => [`${v.size}|${v.pattern}`, v]));

    const products = [];

    // 3. TÜM olası kombinasyonlar için döngü kur.
    for (const size of uniqueSizes) {
        for (const pattern of uniquePatterns) {
            const comboKey = `${size}|${pattern}`;
            const activeVariation = activeCombos.get(comboKey);

            products.push({
                property_values: [
                    { property_id: 513, property_name: "Size", scale_id: null, values: [size] },
                    { property_id: 514, property_name: "Pattern", scale_id: null, values: [pattern] }
                ],
                offerings: [{
                    // Eğer kombinasyon aktifse kendi fiyatını, değilse 0 kullan
                    price: activeVariation ? Number(activeVariation.price) : 0,
                    quantity: 999,
                    is_enabled: !!activeVariation // Aktif kombinasyon haritasında varsa true, yoksa false
                }]
            });
        }
    }
    
    // 4. Envanter verisini oluştur
    const inventoryData = {
        products: products,
        price_on_property: [513, 514], // Fiyatı artık hem boyut hem desen etkileyebilir
        quantity_on_property: [],
        sku_on_property: []
    };
    
    console.log(`[ETSY_API] /inventory'ye gönderilecek ${products.length} adet ürün kombinasyonu hazırlandı.`);
    console.log('[ETSY_API] Envanter verisi:', JSON.stringify(inventoryData, null, 2));

    // 5. Etsy'ye gönder
    const response = await fetch(`${ETSY_API_BASE}/application/listings/${listingId}/inventory`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID, 'Content-Type': 'application/json' },
        body: JSON.stringify(inventoryData),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ ETSY ENVANTER HATASI (Status: ${response.status}):`, errorBody);
        throw new Error(`Envanter ayarlanamadı: ${errorBody}`);
    }

    console.log(`✅ ID'si ${listingId} olan ürünün envanteri başarıyla ayarlandı.`);
}

export async function uploadFilesToEtsy(accessToken: string, shopId: number, listingId: number, images: File[], video: File | null) {
    console.log(`[ETSY_API] Starting media upload for listing ${listingId}`);
    console.log(`[ETSY_API] Found ${images.length} images and ${video ? '1 video' : 'no video'} to upload`);

    const uploadPromises = [];

    // Her resim için ayrı bir YÜKLEME isteği oluştur
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        console.log(`[ETSY_API] Preparing to upload image ${i + 1}/${images.length}: ${image.name}`);
        
        const formData = new FormData();
        formData.append('image', image);
        formData.append('rank', (i + 1).toString());

        const promise = fetch(`${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}/images`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID! },
            body: formData,
        }).then(async res => {
            if (!res.ok) {
                const errorText = await res.text();
                console.error(`[ETSY_API] ❌ Failed to upload image ${image.name}:`, {
                    status: res.status,
                    statusText: res.statusText,
                    error: errorText
                });
                return null;
            }
            console.log(`[ETSY_API] ✅ Successfully uploaded image ${image.name}`);
            return res.json();
        });
        
        uploadPromises.push(promise);
    }

    // Video varsa, onun için de ayrı bir istek oluştur
    if (video) {
        console.log(`[ETSY_API] Preparing to upload video: ${video.name}`);
        
        const formData = new FormData();
        formData.append('video', video);
        formData.append('name', video.name);
        
        const promise = fetch(`${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}/videos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID! },
            body: formData,
        }).then(async res => {
            if (!res.ok) {
                const errorText = await res.text();
                console.error(`[ETSY_API] ❌ Failed to upload video ${video.name}:`, {
                    status: res.status,
                    statusText: res.statusText,
                    error: errorText
                });
                return null;
            }
            console.log(`[ETSY_API] ✅ Successfully uploaded video ${video.name}`);
            return res.json();
        });
        
        uploadPromises.push(promise);
    }
    
    // Tüm yüklemelerin bitmesini bekle
    const results = await Promise.all(uploadPromises);
    
    // Başarısız olanları logla
    const failedUploads = results.filter(r => r === null).length;
    if (failedUploads > 0) {
        console.error(`[ETSY_API] ⚠️ ${failedUploads} media uploads failed`);
    } else {
        console.log(`[ETSY_API] ✅ All media uploads completed successfully`);
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
