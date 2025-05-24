import { type NextRequest, NextResponse } from "next/server"
import { exchangeCodeForToken, syncEtsyDataToDatabase } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state") // This is the user ID
  const error = searchParams.get("error")

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error)}`, request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_parameters", request.url))
  }

  try {
    // Exchange code for tokens
    await exchangeCodeForToken(code, state)

    // Sync Etsy data to database
    await syncEtsyDataToDatabase(state)

    return NextResponse.redirect(new URL("/dashboard?success=etsy_connected", request.url))
  } catch (error) {
    console.error("Etsy callback error:", error)
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent("Failed to connect Etsy account")}`, request.url),
    )
  }
}
