import { supabaseAdmin } from "@/lib/supabase"
import { generatePKCE } from "@/lib/etsy-api"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  // supabaseAdmin direkt kullan
  
  try {
    // Generate PKCE
    const { codeVerifier, codeChallenge } = generatePKCE()
    
    // Oluştur ve kaydet
    const state = Math.random().toString(36).substring(2, 15)
    
    // Etsy OAuth URL
    const etsyClientId = process.env.ETSY_CLIENT_ID
    
    // Tam URL kullan - Etsy'de kayıtlı olan URL olmalı
    const redirectUri = "https://dolphin-app.vercel.app/api/etsy/callback"
    
    // Etsy OAuth parametreleri
    const etsyAuthParams = new URLSearchParams({
      response_type: "code",
      client_id: etsyClientId!,
      redirect_uri: redirectUri,
      scope: "email_r shops_r listings_r transactions_r",
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    })
    
    // Create a temporary ID for this session
    const tempUserId = `temp_${Math.random().toString(36).substring(2, 15)}`
    
    // Store in Supabase
    await supabaseAdmin.from("oauth_states").insert({
      state: state,
      code_verifier: codeVerifier,
      user_id: tempUserId,
      created_at: new Date().toISOString(),
    })
    
    // Etsy OAuth URL'sine yönlendir
    const authUrl = `https://www.etsy.com/oauth/connect?${etsyAuthParams.toString()}`
    
    console.log("Auth URL: ", authUrl) // Debug için
    
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Etsy login error:", error)
    return NextResponse.json({ error: "Etsy login failed" }, { status: 500 })
  }
} 