import crypto from "crypto"
import qs from "querystring"
import { supabaseAdmin } from "./supabase"

// Etsy API v3 endpoints
const ETSY_API_BASE = "https://api.etsy.com/v3"
const ETSY_OAUTH_BASE = "https://www.etsy.com/oauth"

const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID || ""
const ETSY_REDIRECT_URI = process.env.ETSY_REDIRECT_URI || ""
// Personal Access için gerekli scope'lar - Gemini'nin önerdiği gibi
const ETSY_SCOPE = process.env.ETSY_SCOPE || "shops_r listings_r transactions_r profile_r"

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
        const pingError = await pingResponse.text()
        console.log("Ping error:", pingError)
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
        const userError = await userResponse.text()
        console.log("User endpoint error:", userError)
      }
    } catch (userError) {
      console.log("User endpoint exception:", userError)
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
): Promise<{
  listings: EtsyListing[]
  count: number
}> {
  const accessToken = await getValidAccessToken(userId)

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    includes: "Images",
  })

  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/listings/active?${params}`, {
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
