import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    // Test user ID - gerçek bir user ID ile değiştirin
    const userId = "71bca451-a580-4bdd-a7eb-91e2d8aa5d12"
    
    // Auth sessions kontrolü
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from("etsy_auth_sessions")
      .select("*")
      .eq("user_id", userId)
    
    // Tokens kontrolü  
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from("etsy_tokens")
      .select("*")
      .eq("user_id", userId)
    
    // Profile kontrolü
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("etsy_shop_name, etsy_shop_id")
      .eq("id", userId)
      .single()
    
    return NextResponse.json({
      userId,
      sessions: sessions || [],
      sessionsError,
      tokens: tokens || [],
      tokensError,
      profile,
      profileError,
      env: {
        hasClientId: !!process.env.ETSY_CLIENT_ID,
        hasRedirectUri: !!process.env.ETSY_REDIRECT_URI,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        redirectUri: process.env.ETSY_REDIRECT_URI
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 