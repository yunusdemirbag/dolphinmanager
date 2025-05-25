import crypto from "crypto"
import qs from "querystring"
import { supabaseAdmin } from "./supabase"

// Etsy API v3 endpoints
const ETSY_API_BASE = "https://api.etsy.com/v3"
const ETSY_OAUTH_BASE = "https://www.etsy.com/oauth"

const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID || ""
const ETSY_REDIRECT_URI = process.env.ETSY_REDIRECT_URI || ""
// Personal Access için gerekli scope'lar - tüm gerekli izinleri içerecek şekilde güncellendi
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

export async function refreshEtsyToken(userId: string): Promise<EtsyTokens> {
  console.log("Refreshing token for user:", userId)
  
  try {
  const { data: tokenData } = await supabaseAdmin
    .from("etsy_tokens")
    .select("refresh_token")
    .eq("user_id", userId)
    .single()

    if (!tokenData?.refresh_token) {
    throw new Error("No refresh token found")
  }

    // Refresh token isteği - örnekteki gibi
    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': ETSY_CLIENT_ID,
      },
      body: qs.stringify({
        'grant_type': 'refresh_token',
        'client_id': ETSY_CLIENT_ID,
        'refresh_token': tokenData.refresh_token,
      })
  })

  if (!response.ok) {
      const errorText = await response.text()
      console.error("Token refresh error:", response.status, errorText)
      throw new Error(`Token refresh failed: ${response.status} - ${errorText}`)
  }

  const tokens: EtsyTokens = await response.json()
    console.log("Token refresh successful")

    // Token'ları güncelle
    const { error: updateError } = await supabaseAdmin.from("etsy_tokens").upsert({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      token_type: tokens.token_type || 'Bearer',
    updated_at: new Date().toISOString(),
  })

    if (updateError) {
      console.error("Token update error:", updateError)
      throw new Error(`Failed to update tokens: ${updateError.message}`)
    }

    console.log("Tokens updated successfully")
  return tokens

  } catch (error) {
    console.error("Token refresh error:", error)
    throw error
  }
}

async function getValidAccessToken(userId: string): Promise<string> {
  console.log("Getting valid access token for user_id:", userId)
  
  const { data: tokenData, error: tokenError } = await supabaseAdmin
    .from("etsy_tokens")
    .select("access_token, expires_at, refresh_token, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  console.log("Token query result:", { 
    found: !!tokenData, 
    error: tokenError?.message,
    user_id: userId 
  })

  if (tokenError) {
    console.error("Token query error:", tokenError)
  }

  if (!tokenData) {
    console.log("No tokens found for user_id:", userId)
    
    // Debug: Tüm token'ları listele
    const { data: allTokens } = await supabaseAdmin
      .from("etsy_tokens")
      .select("user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10)
    
    console.log("All tokens in database:", allTokens)
    
    throw new Error("No Etsy tokens found. Please reconnect your Etsy account.")
  }

  console.log("Token found:", {
    expires_at: tokenData.expires_at,
    created_at: tokenData.created_at,
    access_token_length: tokenData.access_token.length
  })

  // Check if token is expired
  const expiresAt = new Date(tokenData.expires_at)
  const now = new Date()

  if (expiresAt <= now) {
    console.log("Token expired, refreshing...")
    // Token expired, refresh it
    const newTokens = await refreshEtsyToken(userId)
    return newTokens.access_token
  }

  console.log("Token is valid, returning access token")
  return tokenData.access_token
}

// Veritabanından kaydedilen mağaza bilgilerini al
async function getStoresFromDatabase(userId: string): Promise<EtsyStore[]> {
  console.log("📦 Using database fallback for store data")
  
  try {
    // Veritabanından mağaza bilgilerini al
    const { data: storeData, error: storeError } = await supabaseAdmin
      .from("etsy_stores")
      .select("*")
      .eq("user_id", userId)
    
    if (storeError) {
      console.error("Database query error:", storeError)
      return []
    }
    
    if (!storeData || storeData.length === 0) {
      console.log("No stores found in database")
      return []
    }
    
    console.log(`Found ${storeData.length} stores in database`)
    
    // Her mağaza için kullanıcıya özel görüntüleme bilgilerini ekle
    return storeData.map(store => {
      // Veritabanında bazı alanlar farklı isimle kaydedilmiş olabilir, onları normalize et
      return {
        shop_id: store.shop_id,
        shop_name: store.shop_name,
        title: store.title || store.shop_name,
        announcement: store.announcement || "",
        currency_code: store.currency_code || "USD",
        is_vacation: store.is_vacation === true,
        listing_active_count: store.listing_active_count || 0,
        num_favorers: store.num_favorers || 0,
        url: store.url || `https://www.etsy.com/shop/${store.shop_name}`,
        image_url_760x100: store.image_url_760x100 || store.banner_image_url || "",
        review_count: store.review_count || 0,
        review_average: store.review_average || 0,
        connection_status: "connected", // Veritabanında varsa bağlı kabul et
      } as EtsyStore
    })
  } catch (error) {
    console.error("Database fallback error:", error)
    return []
  }
}

export async function getEtsyStores(userId: string): Promise<EtsyStore[]> {
  try {
    console.log("=== ETSY API DEBUG START ===")
    console.log("User ID:", userId)
    console.log("ETSY_CLIENT_ID:", ETSY_CLIENT_ID ? "SET" : "MISSING")
    console.log("ETSY_REDIRECT_URI:", process.env.ETSY_REDIRECT_URI ? "SET" : "MISSING")
    console.log("ETSY_SCOPE:", ETSY_SCOPE)
    
    const accessToken = await getValidAccessToken(userId)
    console.log("Access token:", accessToken ? "FOUND" : "MISSING")

    // Access token'dan Etsy user ID'yi çıkar
    const etsyUserId = accessToken.split('.')[0]
    console.log("Extracted Etsy user ID from token:", etsyUserId)

    // 1. Basit ping testi
    console.log("=== PING TEST ===")
    try {
      const pingResponse = await fetch(`${ETSY_API_BASE}/application/openapi-ping`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": ETSY_CLIENT_ID,
        },
      })
      console.log("Ping status:", pingResponse.status)
      
      if (pingResponse.ok) {
        const pingText = await pingResponse.text()
        console.log("Ping response:", pingText)
      } else {
        const pingError = await pingResponse.json().catch(() => ({ error: pingResponse.statusText }))
        console.log("Ping error:", pingError)
        
        if (pingResponse.status === 429) {
          console.error("Rate limit exceeded - using database fallback instead")
          return await getStoresFromDatabase(userId)
        }
        
        if (pingResponse.status === 401) {
          console.error("Authentication failed - token may be invalid")
          throw new Error("Etsy authentication failed. Please reconnect your account.")
        }
      }
    } catch (pingError) {
      console.log("Ping exception:", pingError)
    }

    // 2. User endpoint testi - Etsy user ID ile
    console.log("=== USER ENDPOINT TEST ===")
    let userInfo: any = null
    try {
      const userResponse = await fetch(`${ETSY_API_BASE}/application/users/${etsyUserId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": ETSY_CLIENT_ID,
        },
      })
      
      console.log("User endpoint status:", userResponse.status)
      
      if (userResponse.ok) {
        userInfo = await userResponse.json()
        console.log("User info SUCCESS:", JSON.stringify(userInfo, null, 2))
      } else {
        const userErrorRaw = await userResponse.text()
        let userError
        try {
          userError = JSON.parse(userErrorRaw)
        } catch (e) {
          userError = { error: userErrorRaw }
        }
        console.log("User endpoint error:", userError)
        
        if (userResponse.status === 403 && userError?.error === "insufficient_scope") {
          console.error("Insufficient permissions - the app doesn't have required scopes")
          console.error("Please reset your Etsy connection and reconnect with all required permissions")
          throw new Error("Etsy connection lacks required permissions. Please reset and reconnect your account.")
        }
      }
    } catch (userError) {
      console.log("User endpoint exception:", userError)
      if (userError instanceof Error && userError.message.includes("Etsy connection lacks")) {
        throw userError // Re-throw custom error
      }
    }

    // 3. Shop endpoint testi - Etsy user ID ile
    console.log("=== SHOP ENDPOINT TEST ===")
    
    try {
      console.log(`Trying: /application/users/${etsyUserId}/shops`)
      
      const response = await fetch(`${ETSY_API_BASE}/application/users/${etsyUserId}/shops`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": ETSY_CLIENT_ID,
        },
      })

      console.log("Shop endpoint status:", response.status)
      console.log("Shop endpoint ok:", response.ok)

      if (response.ok) {
        const responseText = await response.text()
        console.log("Shop endpoint raw response:", responseText)
        
        if (responseText) {
          try {
            const data = JSON.parse(responseText)
            console.log("Shop endpoint parsed data:", JSON.stringify(data, null, 2))
            
            // Etsy API tek shop döndürürse onu array'e çevir
            let stores = data.results || data.shops || data || []
            
            // Eğer tek obje döndürürse ve shop_id varsa, array'e çevir
            if (!Array.isArray(stores) && stores.shop_id) {
              console.log("Single shop object found, converting to array")
              stores = [stores]
            }
            
            if (Array.isArray(stores) && stores.length > 0) {
              console.log("SUCCESS! Found stores:", stores.length)
              console.log("=== ETSY API DEBUG END ===")
              return stores
            } else {
              console.log("Shop endpoint returned empty data")
              console.log("Data structure:", typeof data, Array.isArray(data))
              console.log("Has shop_id:", !!data.shop_id)
            }
          } catch (parseError) {
            console.log("Shop endpoint JSON parse error:", parseError)
          }
        } else {
          console.log("Shop endpoint returned empty response")
        }
      } else {
        const errorText = await response.text()
        console.log("Shop endpoint error text:", errorText)
        
        // Error'u parse etmeyi dene
        try {
          const errorData = JSON.parse(errorText)
          console.log("Shop endpoint error data:", JSON.stringify(errorData, null, 2))
        } catch (e) {
          console.log("Could not parse error as JSON")
        }
      }
    } catch (fetchError) {
      console.log("Shop endpoint fetch exception:", fetchError)
    }

    // 4. Alternatif: Direkt shop ID ile deneme (eğer user ID aynı zamanda shop ID ise)
    console.log("=== ALTERNATIVE: DIRECT SHOP ACCESS ===")
    try {
      console.log(`Trying: /application/shops/${etsyUserId}`)
      
      const shopResponse = await fetch(`${ETSY_API_BASE}/application/shops/${etsyUserId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": ETSY_CLIENT_ID,
        },
      })

      console.log("Direct shop access status:", shopResponse.status)

      if (shopResponse.ok) {
        const shopText = await shopResponse.text()
        console.log("Direct shop access response:", shopText)
        
        if (shopText) {
          const shopData = JSON.parse(shopText)
          console.log("Direct shop data:", JSON.stringify(shopData, null, 2))
          
          // Tek shop döndürürse array'e çevir
          if (shopData && !Array.isArray(shopData)) {
            console.log("SUCCESS! Found single shop via direct access")
            return [shopData]
          }
        }
      } else {
        const shopError = await shopResponse.text()
        console.log("Direct shop access error:", shopError)
      }
    } catch (directError) {
      console.log("Direct shop access exception:", directError)
    }

    console.log("=== FINAL RESULT ===")
    console.log("No shops found - returning empty array")
    console.log("=== ETSY API DEBUG END ===")
    return []

  } catch (error) {
    console.error("getEtsyStores critical error:", error)
    throw error
  }
}

export async function getEtsyListings(
  userId: string,
  shopId: number,
  limit = 25,
  offset = 0,
  state: 'active' | 'inactive' | 'draft' | 'expired' | 'all' = 'active',
): Promise<{
  listings: EtsyListing[]
  count: number
}> {
  const accessToken = await getValidAccessToken(userId)

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    includes: "Images,Tags",
  })

  // state parametresini URL'ye ekle
  if (state !== 'all') {
    params.append('state', state);
  }

  // Endpoint'i state parametresine göre değiştir
  let endpoint = `${ETSY_API_BASE}/application/shops/${shopId}/listings`;
  if (state === 'active') {
    endpoint += '/active';
  } else if (state === 'all') {
    // Tüm durumlar için farklı bir endpoint kullanılmaz
  } else {
    // Belirli bir durum için sorgu yapılıyor
    params.append('state', state);
  }

  console.log(`Fetching Etsy listings: ${endpoint}?${params.toString()}`);

  try {
    const response = await fetch(`${endpoint}?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
        "x-api-key": ETSY_CLIENT_ID,
    },
  })

  if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Etsy API error:", errorData)
      throw new Error(`Failed to fetch listings: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return {
    listings: data.results || [],
    count: data.count || 0,
    }
  } catch (error) {
    console.error("getEtsyListings error:", error);
    return {
      listings: [],
      count: 0
    };
  }
}

export async function syncEtsyDataToDatabase(userId: string): Promise<void> {
  try {
    console.log("Starting Etsy data sync for user:", userId)
    
    // Önce stores bilgisini çek
    const stores = await getEtsyStores(userId)
    console.log("Fetched stores:", stores.length)
    
    if (stores.length > 0) {
      const primaryStore = stores[0] // İlk store'u ana store olarak kullan
      
      // Profile'ı gerçek store bilgileriyle güncelle
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          etsy_shop_name: primaryStore.shop_name,
          etsy_shop_id: primaryStore.shop_id.toString(),
        })
        .eq("id", userId)

      if (profileError) {
        console.error("Profile update error:", profileError)
        throw profileError
      }
      
      console.log("Profile updated with real store data:", primaryStore.shop_name)
      
      // Listings bilgisini çek (opsiyonel)
      try {
        const { listings, count } = await getEtsyListings(userId, primaryStore.shop_id, 25, 0)
        console.log(`Fetched ${listings.length} listings out of ${count} total`)
      } catch (listingsError) {
        console.warn("Could not fetch listings, but store connection is successful:", listingsError)
        // Listings çekilemese bile store bağlantısı başarılı
      }
      
    } else {
      // Store bulunamadı ama token geçerli - bu normal olabilir
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          etsy_shop_name: "Etsy Bağlantısı Aktif",
          etsy_shop_id: "connected",
        })
        .eq("id", userId)
      
      if (profileError) {
        console.error("Profile update error:", profileError)
        // Bu durumda bile hata fırlatma, sadece logla
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
        })
        .eq("id", userId)
      
      console.log("Marked as limited access due to API restrictions")
    } catch (fallbackError) {
      console.error("Fallback update also failed:", fallbackError)
      // Artık hata fırlatma, sadece logla
      console.warn("Could not update profile even with fallback")
    }
    
    // Artık hata fırlatmıyoruz - bağlantı başarılı sayılsın
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
  offset = 0
): Promise<{
  payments: EtsyPayment[]
  count: number
}> {
  const accessToken = await getValidAccessToken(userId)

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  })

  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/payments?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": ETSY_CLIENT_ID,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Etsy Payments API error:", errorData)
    throw new Error(`Failed to fetch payments: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return {
    payments: data.results || [],
    count: data.count || 0,
  }
}

// Etsy Receipts API - Sipariş verilerini çeker
export async function getEtsyReceipts(
  userId: string,
  shopId: number,
  limit = 25,
  offset = 0
): Promise<{
  receipts: EtsyReceipt[]
  count: number
}> {
  const accessToken = await getValidAccessToken(userId)

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  })

  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/receipts?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": ETSY_CLIENT_ID,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Etsy Receipts API error:", errorData)
    throw new Error(`Failed to fetch receipts: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return {
    receipts: data.results || [],
    count: data.count || 0,
  }
}

// Etsy Ledger Entries API - Hesap hareketlerini çeker
export async function getEtsyLedgerEntries(
  userId: string,
  shopId: number,
  limit = 25,
  offset = 0,
  minCreated?: number,
  maxCreated?: number
): Promise<{
  entries: EtsyLedgerEntry[]
  count: number
}> {
  const accessToken = await getValidAccessToken(userId)

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  })

  if (minCreated) {
    params.append('min_created', minCreated.toString())
  }
  if (maxCreated) {
    params.append('max_created', maxCreated.toString())
  }

  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/payment-account/ledger-entries?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": ETSY_CLIENT_ID,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Etsy Ledger API error:", errorData)
    throw new Error(`Failed to fetch ledger entries: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return {
    entries: data.results || [],
    count: data.count || 0,
  }
}

// Finansal özet hesaplama fonksiyonu
export async function calculateFinancialSummary(
  userId: string,
  shopId: number,
  days = 30
): Promise<{
  totalRevenue: number
  totalOrders: number
  totalFees: number
  netRevenue: number
  averageOrderValue: number
  currency: string
}> {
  try {
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

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      totalFees: Math.round(totalFees * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      currency
    }
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
  const accessToken = await getValidAccessToken(userId)

  const formData = new URLSearchParams()
  
  if (updateData.title) formData.append('title', updateData.title)
  if (updateData.description) formData.append('description', updateData.description)
  if (updateData.price) formData.append('price', updateData.price.toString())
  if (updateData.quantity) formData.append('quantity', updateData.quantity.toString())
  if (updateData.state) formData.append('state', updateData.state)
  if (updateData.shipping_profile_id) formData.append('shipping_profile_id', updateData.shipping_profile_id.toString())
  if (updateData.processing_min) formData.append('processing_min', updateData.processing_min.toString())
  if (updateData.processing_max) formData.append('processing_max', updateData.processing_max.toString())
  
  if (updateData.tags) {
    updateData.tags.forEach(tag => formData.append('tags', tag))
  }
  if (updateData.materials) {
    updateData.materials.forEach(material => formData.append('materials', material))
  }

  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": ETSY_CLIENT_ID,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("Update listing error:", errorData)
    throw new Error(`Failed to update listing: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return data
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
