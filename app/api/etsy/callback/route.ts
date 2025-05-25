import { NextRequest, NextResponse } from "next/server"
import { exchangeCodeForToken, syncEtsyDataToDatabase } from "@/lib/etsy-api"
import { createServerSupabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state") // Bu user_id olacak
  const error = searchParams.get("error")

  // Hata kontrolü
  if (error) {
    console.error("Etsy OAuth error:", error)
    return NextResponse.redirect(
      new URL(`/dashboard?error=${error}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard?error=missing_params", request.url)
    )
  }

  try {
    // Kullanıcı kontrolü
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || user.id !== state) {
      throw new Error("Unauthorized")
    }

    // Token değişimi
    await exchangeCodeForToken(code, state)
    
    // Etsy verilerini senkronize et
    await syncEtsyDataToDatabase(state)

    // Başarılı - dashboard'a yönlendir
    return NextResponse.redirect(
      new URL("/dashboard?etsy=connected", request.url)
    )
  } catch (error) {
    console.error("Etsy callback error:", error)
    return NextResponse.redirect(
      new URL("/dashboard?error=etsy_connection_failed", request.url)
    )
  }
}
