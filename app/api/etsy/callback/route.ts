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
      new URL(`/onboarding?error=${error}`, request.url)
    )
  }

  if (!code || !state) {
    console.error("Missing params:", { code, state })
    return NextResponse.redirect(
      new URL("/onboarding?error=missing_params", request.url)
    )
  }

  try {
    console.log("Processing Etsy callback for user:", state)

    // Token değişimi
    console.log("Exchanging code for token...")
    try {
      await exchangeCodeForToken(code, state)
      console.log("Token exchange successful")
    } catch (tokenError) {
      console.error("Token exchange failed:", tokenError)
      throw new Error(`Token exchange failed: ${String(tokenError)}`)
    }
    
    // Etsy verilerini senkronize et
    console.log("Syncing Etsy data...")
    try {
      await syncEtsyDataToDatabase(state)
      console.log("Data sync successful")
    } catch (syncError) {
      console.error("Data sync failed:", syncError)
      throw new Error(`Data sync failed: ${String(syncError)}`)
    }

    // Başarılı - dashboard'a yönlendir
    console.log("Etsy connection completed successfully, redirecting to dashboard")
    return NextResponse.redirect(
      new URL("/dashboard?etsy=connected", request.url)
    )
  } catch (error) {
    console.error("Etsy callback error:", error)
    console.error("Error details:", {
      message: String(error),
      code,
      state
    })
    return NextResponse.redirect(
      new URL("/onboarding?error=etsy_connection_failed", request.url)
    )
  }
}
