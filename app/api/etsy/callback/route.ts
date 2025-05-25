import { NextRequest, NextResponse } from "next/server"
import qs from "querystring"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 })
  }

  // State'e göre verifier'ı bul
  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from("oauth_states")
    .select("code_verifier, user_id")
    .eq("state", state)
    .single()

  if (sessionError || !sessionData) {
    console.error("State lookup error:", sessionError)
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 })
  }

  // Etsy token değişimi
  try {
    const body = qs.stringify({
      grant_type: "authorization_code",
      client_id: process.env.ETSY_CLIENT_ID!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/etsy/callback`,
      code,
      code_verifier: sessionData.code_verifier,
    })

    const tokenResponse = await fetch("https://api.etsy.com/v3/public/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-api-key": process.env.ETSY_CLIENT_ID!,
      },
      body,
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Token exchange error:", errorText)
      return NextResponse.json({ error: errorText }, { status: tokenResponse.status })
    }

    const tokenData = await tokenResponse.json()

    // Etsy user bilgilerini al
    const etsyUserResponse = await fetch("https://api.etsy.com/v3/application/users/me", {
      headers: {
        "x-api-key": process.env.ETSY_CLIENT_ID!,
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!etsyUserResponse.ok) {
      console.error("Failed to get Etsy user info")
      return NextResponse.json({ error: "Failed to get Etsy user info" }, { status: 500 })
    }

    const etsyUser = await etsyUserResponse.json()

    // Etsy mağaza bilgilerini al
    const etsyShopResponse = await fetch("https://api.etsy.com/v3/application/shops", {
      headers: {
        "x-api-key": process.env.ETSY_CLIENT_ID!,
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!etsyShopResponse.ok) {
      console.error("Failed to get Etsy shop info")
      return NextResponse.json({ error: "Failed to get Etsy shop info" }, { status: 500 })
    }

    const etsyShopData = await etsyShopResponse.json()
    const shop = etsyShopData.results[0] // İlk mağaza

    // Tüm bilgileri profile kaydet
    const tempUserId = sessionData.user_id
    
    // Bu noktada yeni kullanıcı oluşturabilir veya mevcut bir kullanıcıya bağlayabilirsiniz
    // Örnek olarak geçici bir kayıt yapıyoruz
    await supabaseAdmin.from("profiles").upsert({
      id: tempUserId,
      etsy_user_id: etsyUser.user_id.toString(),
      etsy_shop_id: shop.shop_id.toString(),
      etsy_shop_name: shop.shop_name,
      full_name: etsyUser.first_name + " " + etsyUser.last_name,
      updated_at: new Date().toISOString(),
    })

    // Token bilgilerini kaydet
    await supabaseAdmin.from("etsy_tokens").upsert({
      user_id: tempUserId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      created_at: new Date().toISOString(),
    })

    // State kaydını temizle
    await supabaseAdmin.from("oauth_states").delete().eq("state", state)

    // Başarı sayfasına yönlendir
    return NextResponse.redirect(new URL("/dashboard", req.url))
  } catch (error) {
    console.error("Callback processing error:", error)
    return NextResponse.json({ error: "Failed to process callback" }, { status: 500 })
  }
}
