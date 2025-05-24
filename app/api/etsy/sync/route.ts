import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { syncEtsyDataToDatabase } from "@/lib/etsy-api"

export async function POST(request: NextRequest) {
  try {
    // Get user from request
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await syncEtsyDataToDatabase(user.id)

    return NextResponse.json({ success: true, message: "Etsy data synced successfully" })
  } catch (error) {
    console.error("Etsy sync error:", error)
    return NextResponse.json({ error: "Failed to sync Etsy data" }, { status: 500 })
  }
}
