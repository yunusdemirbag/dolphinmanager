import { NextRequest } from "next/server"
import { exchangeCodeForToken, syncEtsyDataToDatabase } from "@/lib/etsy-api"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (!code || !state) {
      return new Response("Missing code or state", { status: 400 })
    }

    // Exchange code for token
    const tokens = await exchangeCodeForToken(code, state)

    // Sync Etsy data
    await syncEtsyDataToDatabase(state)

    // Create supabase client
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Update user profile
    await supabase
      .from("profiles")
      .update({
        etsy_connected: true,
        etsy_connected_at: new Date().toISOString(),
      })
      .eq("id", state)

    // Redirect to dashboard
    return Response.redirect("https://dolphinmanager.vercel.app/dashboard")
  } catch (error: any) {
    console.error("Etsy callback error:", error)
    return Response.redirect("https://dolphinmanager.vercel.app/onboarding?error=" + encodeURIComponent(error.message))
  }
}
