import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getEtsyAuthUrl } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    // Get user from request headers or session
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract user ID from auth header or use alternative method
    const token = authHeader.replace("Bearer ", "")

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const authUrl = await getEtsyAuthUrl(user.id)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error("Etsy auth error:", error)
    return NextResponse.json({ error: "Failed to generate auth URL" }, { status: 500 })
  }
}
