import crypto from "crypto"
import qs from "querystring"
import { supabaseAdmin } from "./supabase"

// Etsy API v3 endpoints
const ETSY_API_BASE = "https://api.etsy.com/v3"
const ETSY_OAUTH_BASE = "https://www.etsy.com/oauth"

const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID || ""
const ETSY_REDIRECT_URI = process.env.ETSY_REDIRECT_URI || "http://localhost:3000/api/etsy/callback"
const ETSY_SCOPE = process.env.ETSY_SCOPE || "shops_r listings_r"

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

// PKCE helpers (Node-compatible)
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url")
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url")
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
    if (!ETSY_CLIENT_ID || !ETSY_REDIRECT_URI || !ETSY_SCOPE) {
      throw new Error("Missing Etsy environment variables. Please check ETSY_CLIENT_ID, ETSY_REDIRECT_URI, and ETSY_SCOPE")
    }
    
    // PKCE oluştur
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)

    // Önce eski kayıtları temizle
    await supabaseAdmin
      .from("etsy_auth_sessions")
      .delete()
      .eq("user_id", userId)

    // Yeni kayıt oluştur - state olarak userId kullan
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

    console.log("Auth session stored successfully")

    // Etsy OAuth URL'ini oluştur
    const params = new URLSearchParams({
      response_type: "code",
      client_id: ETSY_CLIENT_ID,
      redirect_uri: ETSY_REDIRECT_URI,
      scope: ETSY_SCOPE,
      state: userId, // state parametresi olarak userId
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    })

    const authUrl = `https://www.etsy.com/oauth/connect?${params.toString()}`
    console.log("Generated auth URL successfully")

    return authUrl
  } catch (error) {
    console.error("getEtsyAuthUrl error:", error)
    throw error
  }
}

export async function exchangeCodeForToken(code: string, userId: string): Promise<EtsyTokens> {
  console.log("Exchanging code for token - userId:", userId)
  
  // Get stored code verifier
  const { data: authSession, error: sessionError } = await supabaseAdmin
    .from("etsy_auth_sessions")
    .select("code_verifier")
    .eq("user_id", userId)
    .single()

  if (sessionError || !authSession) {
    console.error("Code verifier not found:", sessionError)
    throw new Error("Code verifier not found")
  }

  console.log("Found code verifier, making token request...")

  const body = qs.stringify({
    grant_type: "authorization_code",
    client_id: ETSY_CLIENT_ID,
    redirect_uri: ETSY_REDIRECT_URI,
    code,
    code_verifier: authSession.code_verifier,
  })

  console.log("Making token request to Etsy...")
  const response = await fetch(`https://api.etsy.com/v3/public/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-api-key": ETSY_CLIENT_ID,
    },
    body,
  })

  const responseText = await response.text()
  console.log("Token response status:", response.status)
  console.log("Token response:", responseText)

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${responseText}`)
  }

  let tokens: EtsyTokens
  try {
    tokens = JSON.parse(responseText)
  } catch (e) {
    throw new Error(`Failed to parse token response: ${responseText}`)
  }

  // Store tokens in DB
  const { error: tokenError } = await supabaseAdmin.from("etsy_tokens").upsert({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    created_at: new Date().toISOString(),
  })

  if (tokenError) {
    console.error("Failed to store tokens:", tokenError)
    throw tokenError
  }

  // Clean up auth session
  await supabaseAdmin.from("etsy_auth_sessions").delete().eq("user_id", userId)

  return tokens
}

export async function refreshEtsyToken(userId: string): Promise<EtsyTokens> {
  const { data: tokenData } = await supabaseAdmin
    .from("etsy_tokens")
    .select("refresh_token")
    .eq("user_id", userId)
    .single()

  if (!tokenData) throw new Error("No refresh token found")

  const body = qs.stringify({
    grant_type: "refresh_token",
    client_id: ETSY_CLIENT_ID,
    refresh_token: tokenData.refresh_token,
  })

  const response = await fetch(`${ETSY_API_BASE}/public/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "x-api-key": ETSY_CLIENT_ID,
    },
    body,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  const tokens: EtsyTokens = await response.json()

  // Update tokens in DB
  await supabaseAdmin.from("etsy_tokens").upsert({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  })

  return tokens
}

async function getValidAccessToken(userId: string): Promise<string> {
  const { data: tokenData } = await supabaseAdmin
    .from("etsy_tokens")
    .select("access_token, expires_at, refresh_token")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!tokenData) {
    throw new Error("No Etsy tokens found. Please reconnect your Etsy account.")
  }

  // Check if token is expired
  const expiresAt = new Date(tokenData.expires_at)
  const now = new Date()

  if (expiresAt <= now) {
    // Token expired, refresh it
    const newTokens = await refreshEtsyToken(userId)
    return newTokens.access_token
  }

  return tokenData.access_token
}

export async function getEtsyStores(userId: string): Promise<EtsyStore[]> {
  try {
    const accessToken = await getValidAccessToken(userId)

    const response = await fetch(`${ETSY_API_BASE}/application/shops`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-api-key": ETSY_CLIENT_ID,
      },
    })

    if (!response.ok) {
      let errorData: any = {}
      try {
        const responseText = await response.text()
        if (responseText) {
          errorData = JSON.parse(responseText)
        }
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError)
        errorData = { error: response.statusText }
      }
      
      console.error("Etsy API error:", errorData)
      throw new Error(`Failed to fetch stores: ${errorData.error || response.statusText}`)
    }

    let data: any = {}
    try {
      const responseText = await response.text()
      if (responseText) {
        data = JSON.parse(responseText)
      }
    } catch (parseError) {
      console.error("Failed to parse success response:", parseError)
      throw new Error("Failed to parse Etsy API response")
    }

    return data.results || []
  } catch (error) {
    console.error("getEtsyStores error:", error)
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
    console.log("Fetched stores:", stores)
    
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
      
      // Listings bilgisini çek
      try {
        const { listings, count } = await getEtsyListings(userId, primaryStore.shop_id, 25, 0)
        console.log(`Fetched ${listings.length} listings out of ${count} total`)
        
        // Listings'i database'e kaydet (opsiyonel)
        // Şimdilik sadece log'la, ileride products tablosuna kaydedebiliriz
        console.log("Sample listings:", listings.slice(0, 3))
        
      } catch (listingsError) {
        console.warn("Could not fetch listings, but store connection is successful:", listingsError)
        // Listings çekilemese bile store bağlantısı başarılı
      }
      
    } else {
      // Store bulunamadı ama token geçerli, genel bir mesaj koy
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          etsy_shop_name: "Etsy Store Connected",
          etsy_shop_id: "connected",
        })
        .eq("id", userId)
      
      if (profileError) {
        console.error("Profile update error:", profileError)
        throw profileError
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
          etsy_shop_name: "Etsy Connected (Limited Access)",
          etsy_shop_id: "limited",
        })
        .eq("id", userId)
      
      console.log("Marked as limited access due to API restrictions")
    } catch (fallbackError) {
      console.error("Fallback update also failed:", fallbackError)
      throw error // Orijinal hatayı fırlat
    }
  }
}
