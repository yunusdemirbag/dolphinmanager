import { supabaseAdmin } from "@/lib/supabase"
import { generatePKCE } from "@/lib/etsy-api"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function GET(req: NextRequest) {
  // supabaseAdmin direkt kullan
  
  try {
    // Generate PKCE
    const { codeVerifier, codeChallenge } = generatePKCE()
    
    // Daha güvenilir state üretimi için UUID kullan
    const state = crypto.randomUUID().replace(/-/g, "").substring(0, 10)
    console.log("Generated state:", state)
    
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
    const tempUserId = `temp_${crypto.randomUUID().substring(0, 8)}`
    
    // Store in Supabase - eskilerini temizle
    // Önce eski kayıtları temizle
    await supabaseAdmin.from("oauth_states").delete().lt("created_at", new Date(Date.now() - 86400000).toISOString())
    
    // Yeni state'i kaydet
    const { data, error } = await supabaseAdmin.from("oauth_states").insert({
      state: state,
      code_verifier: codeVerifier,
      user_id: tempUserId,
      created_at: new Date().toISOString(),
    })
    
    if (error) {
      console.error("Error storing state in Supabase:", error)
      return NextResponse.json({ error: "Failed to store OAuth state" }, { status: 500 })
    }
    
    console.log("State stored successfully:", state)
    
    // Etsy OAuth URL'sine yönlendir
    const authUrl = `https://www.etsy.com/oauth/connect?${etsyAuthParams.toString()}`
    
    console.log("Auth URL: ", authUrl) // Debug için
    
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Etsy login error:", error)
    return NextResponse.json({ error: "Etsy login failed" }, { status: 500 })
  }
} 