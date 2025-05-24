import { supabaseAdmin } from "./supabase"

// Etsy API v3 endpoints
const ETSY_API_BASE = "https://api.etsy.com/v3"
const ETSY_OAUTH_BASE = "https://www.etsy.com/oauth"

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

// PKCE helper functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

export async function getEtsyAuthUrl(userId: string): Promise<string> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  // Store code verifier in database for later use
  await supabaseAdmin.from("etsy_auth_sessions").upsert({
    user_id: userId,
    code_verifier: codeVerifier,
    created_at: new Date().toISOString(),
  })

  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: "https://dolphin-app.vercel.app/api/etsy/callback",
    scope: "shops_r listings_r",
    client_id: "vqxojc8u4keyk1ovhj3u7vzn", // Personal Access Token as client_id
    state: userId,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })

  return `${ETSY_OAUTH_BASE}/connect?${params.toString()}`
}

export async function exchangeCodeForToken(code: string, userId: string): Promise<EtsyTokens> {
  // Get stored code verifier
  const { data: authSession } = await supabaseAdmin
    .from("etsy_auth_sessions")
    .select("code_verifier")
    .eq("user_id", userId)
    .single()

  if (!authSession) {
    throw new Error("Code verifier not found")
  }

  const response = await fetch(`${ETSY_API_BASE}/public/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "vqxojc8u4keyk1ovhj3u7vzn", // Personal Access Token as client_id
      redirect_uri: "https://dolphin-app.vercel.app/api/etsy/callback",
      code: code,
      code_verifier: authSession.code_verifier,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  const tokens: EtsyTokens = await response.json()

  // Store tokens in database
  await supabaseAdmin.from("etsy_tokens").upsert({
    user_id: userId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    created_at: new Date().toISOString(),
  })

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

  if (!tokenData) {
    throw new Error("No refresh token found")
  }

  const response = await fetch(`${ETSY_API_BASE}/public/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: "vqxojc8u4keyk1ovhj3u7vzn",
      refresh_token: tokenData.refresh_token,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  const tokens: EtsyTokens = await response.json()

  // Update tokens in database
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
  const accessToken = await getValidAccessToken(userId)

  const response = await fetch(`${ETSY_API_BASE}/application/shops`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-api-key": "vqxojc8u4keyk1ovhj3u7vzn",
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch stores: ${error}`)
  }

  const data = await response.json()
  return data.results || []
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
      "x-api-key": "vqxojc8u4keyk1ovhj3u7vzn",
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch listings: ${error}`)
  }

  const data = await response.json()
  return {
    listings: data.results || [],
    count: data.count || 0,
  }
}

export async function syncEtsyDataToDatabase(userId: string): Promise<void> {
  try {
    // Get user's Etsy stores
    const stores = await getEtsyStores(userId)

    for (const store of stores) {
      // Update user profile with primary store info
      await supabaseAdmin
        .from("profiles")
        .update({
          etsy_shop_name: store.shop_name,
          etsy_shop_id: store.shop_id.toString(),
        })
        .eq("id", userId)

      // Store shop info
      await supabaseAdmin.from("etsy_stores").upsert({
        user_id: userId,
        shop_id: store.shop_id,
        shop_name: store.shop_name,
        title: store.title,
        currency_code: store.currency_code,
        listing_active_count: store.listing_active_count,
        num_favorers: store.num_favorers,
        review_count: store.review_count,
        review_average: store.review_average,
        url: store.url,
        image_url: store.image_url_760x100,
        last_synced_at: new Date().toISOString(),
      })

      // Get listings for this store
      const { listings } = await getEtsyListings(userId, store.shop_id, 100)

      // Sync listings to database
      for (const listing of listings) {
        const productData = {
          user_id: userId,
          title: listing.title,
          description: listing.description,
          price: listing.price.amount / listing.price.divisor,
          currency: listing.price.currency_code,
          stock_quantity: listing.quantity,
          etsy_listing_id: listing.listing_id.toString(),
          images: listing.images?.map((img) => img.url_570xN) || [],
          tags: listing.tags || [],
          status: listing.state === "active" ? "active" : "inactive",
        }

        await supabaseAdmin.from("products").upsert(productData, {
          onConflict: "etsy_listing_id",
        })
      }

      // Add analytics data
      const today = new Date().toISOString().split("T")[0]

      await supabaseAdmin.from("analytics").upsert(
        [
          {
            user_id: userId,
            metric_type: "view",
            value: store.listing_active_count,
            date: today,
          },
          {
            user_id: userId,
            metric_type: "favorite",
            value: store.num_favorers,
            date: today,
          },
        ],
        {
          onConflict: "user_id,metric_type,date",
        },
      )
    }
  } catch (error) {
    console.error("Error syncing Etsy data:", error)
    throw error
  }
}
