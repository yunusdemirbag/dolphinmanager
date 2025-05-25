import { NextResponse } from "next/server"
import { generatePKCE } from "@/lib/etsy-oauth"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function GET() {
  const { verifier, challenge } = generatePKCE()
  const state = crypto.randomUUID()
  const supabase = createClient(cookies())

  // Kullanıcıyı session'dan bul
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dolphin-app.vercel.app"
    return NextResponse.redirect(`${baseUrl}/auth/login`)
  }

  // user_id ile insert et
  const { data, error } = await supabase.from("etsy_auth_sessions").insert({
    user_id: session.user.id,
    state,
    code_verifier: verifier,
    created_at: new Date().toISOString(),
  })
  console.log("SUPABASE INSERT", { data, error })

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ETSY_CLIENT_ID!,
    redirect_uri: process.env.ETSY_REDIRECT_URI!,
    scope: process.env.ETSY_SCOPE!,    // örn: "shops_r shops_w listings_r listings_w"
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  })

  return NextResponse.redirect(
    `https://www.etsy.com/oauth/connect?${params.toString()}`
  )
} 