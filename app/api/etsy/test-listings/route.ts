import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getEtsyListings } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const shopId = searchParams.get("shopId")

    if (!shopId) {
      return NextResponse.json({ success: false, error: "Shop ID required" }, { status: 400 })
    }

    const { listings, count } = await getEtsyListings(user.id, Number.parseInt(shopId), 10)

    return NextResponse.json({
      success: true,
      listings,
      count,
    })
  } catch (error) {
    console.error("Test listings error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch listings",
    })
  }
}
