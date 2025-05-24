import { NextRequest, NextResponse } from "next/server"
import qs from "querystring"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 })
  }

  // Get stored PKCE data from Supabase
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: session } = await supabase
    .from("etsy_auth_sessions")
    .select("code_verifier")
    .eq("state", state)
    .single()

  if (!session) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 })
  }

  const body = qs.stringify({
    grant_type: "authorization_code",
    client_id: process.env.ETSY_CLIENT_ID!,
    redirect_uri: process.env.ETSY_REDIRECT_URI!,
    code,
    code_verifier: session.code_verifier,
  })

  const tokenRes = await fetch("https://api.etsy.com/v3/public/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!tokenRes.ok) {
    return NextResponse.json(
      { error: await tokenRes.text() },
      { status: tokenRes.status }
    )
  }

  const token = await tokenRes.json()

  // Store tokens in Supabase
  await supabase.from("etsy_tokens").upsert({
    user_id: state,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    created_at: new Date().toISOString(),
  })

  // Clean up auth session
  await supabase
    .from("etsy_auth_sessions")
    .delete()
    .eq("state", state)

  return NextResponse.redirect("/dashboard")
}
