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
    
    // Geçici kullanıcı ID'si
    const tempUserId = `temp_${crypto.randomUUID().substring(0, 8)}`
    
    console.log("Trying to store state in Supabase")
    
    // etsy_auth_sessions tablosunun yapısını kontrol et ve uygun şekilde kaydet
    try {
      // Önce tablo yapısını incelemek için bir kayıt oluşturalım
      // Supabase'in error mesajından sütun adlarını öğrenmek için
      const { error: tableInfoError } = await supabaseAdmin
        .from("etsy_auth_sessions")
        .select("*")
        .limit(1)
      
      console.log("Table structure check:", tableInfoError ? tableInfoError.message : "success")
      
      // Basit bir yapı ile deneyelim - sadece state ve code_verifier
      const { data, error } = await supabaseAdmin
        .from("etsy_auth_sessions")
        .insert({
          state: state,
          code_verifier: codeVerifier
          // user_id sütunu olmadığı için eklenmedi
        })
      
      if (error) {
        console.error("Error storing state in Supabase:", error)
        console.error("Error details:", JSON.stringify(error))
        return NextResponse.json({ 
          error: "Failed to store OAuth state",
          details: error
        }, { status: 500 })
      }
      
      // Ayrı bir tablo kullanarak user_id bilgisini sakla
      await supabaseAdmin.from("temp_users").upsert({
        id: tempUserId,
        state: state,
        created_at: new Date().toISOString()
      }).select()
      
      console.log("State stored successfully:", state)
    } catch (dbError) {
      console.error("Exception during DB operation:", dbError)
      return NextResponse.json({ 
        error: "Database exception",
        details: dbError
      }, { status: 500 })
    }
    
    // Etsy OAuth URL'sine yönlendir
    const authUrl = `https://www.etsy.com/oauth/connect?${etsyAuthParams.toString()}`
    
    console.log("Auth URL: ", authUrl)
    
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Etsy login error:", error)
    return NextResponse.json({ error: "Etsy login failed", details: error }, { status: 500 })
  }
} 