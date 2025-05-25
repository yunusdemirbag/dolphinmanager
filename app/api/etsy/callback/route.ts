import { NextRequest, NextResponse } from "next/server"
import { exchangeCodeForToken, syncEtsyDataToDatabase } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state") // Bu user_id olacak
  const error = searchParams.get("error")
  const error_description = searchParams.get("error_description")

  console.log("Etsy callback params:", { code, state, error, error_description })

  // Hata kontrolü
  if (error) {
    console.error("Etsy OAuth error:", error, error_description)
    return NextResponse.redirect(
      new URL(`/stores?error=${error}&description=${encodeURIComponent(error_description || '')}`, request.url)
    )
  }

  if (!code || !state) {
    console.error("Missing params:", { code, state })
    return NextResponse.redirect(
      new URL("/stores?error=missing_params", request.url)
    )
  }

  try {
    // Token değişimi
    console.log("Exchanging code for token...")
    const tokens = await exchangeCodeForToken(code, state)
    console.log("Token exchange successful, access token received")
    
    // Etsy verilerini senkronize et
    console.log("Syncing Etsy data...")
    await syncEtsyDataToDatabase(state)
    console.log("Data sync completed successfully")

    // Başarılı - stores sayfasına yönlendir (etsy=connected parametresi ile)
    return NextResponse.redirect(
      new URL("/stores?etsy=connected", request.url)
    )
  } catch (error: any) {
    console.error("Etsy callback error details:", {
      error: error.message,
      stack: error.stack,
      state,
      code: code.substring(0, 10) + "..."
    })
    
    // Hata durumunda stores sayfasına yönlendir
    return NextResponse.redirect(
      new URL("/stores?error=etsy_connection_failed&details=" + encodeURIComponent(error.message), request.url)
    )
  }
}
