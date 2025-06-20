import { supabaseAdmin } from '@/lib/supabase/admin'
import { generatePKCE } from "@/lib/etsy-api"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    // Supabase oturumundan user_id al
    const authHeader = req.headers.get("authorization")
    let userId: string | null = null
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "")
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      userId = user?.id || null
    }
    // Eğer header yoksa, cookie'den veya başka bir yerden de alınabilir (gerekirse eklenir)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // PKCE üret
    const { codeVerifier, codeChallenge } = generatePKCE()
    
    // State olarak user_id kullan
    const state = userId
    
    // Etsy OAuth parametreleri
    const etsyClientId = process.env.ETSY_CLIENT_ID
    const redirectUri = "https://dolphin-app.vercel.app/api/etsy/callback"
    const etsyAuthParams = new URLSearchParams({
      response_type: "code",
      client_id: etsyClientId!,
      redirect_uri: redirectUri,
      scope: "email_r shops_r shops_w listings_r listings_w listings_d transactions_r transactions_w profile_r address_r address_w billing_r cart_r cart_w",
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    })

    // Supabase'e kaydet
    const { error } = await supabaseAdmin.from("etsy_auth_sessions").upsert({
      user_id: userId,
      code_verifier: codeVerifier,
      created_at: new Date().toISOString(),
    })
    if (error) {
      console.error("Error storing state in Supabase:", error)
      return NextResponse.json({ error: "Failed to store OAuth state", details: error }, { status: 500 })
    }

    // Etsy OAuth URL'sine yönlendir
    const authUrl = `https://www.etsy.com/oauth/connect?${etsyAuthParams.toString()}`
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Etsy login error:", error)
    return NextResponse.json({ error: "Etsy login failed", details: error }, { status: 500 })
  }
} 