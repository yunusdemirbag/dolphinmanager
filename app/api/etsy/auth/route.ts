import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getEtsyAuthUrl } from "@/lib/etsy-api"
import { createServerSupabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Request body'den userId al
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      )
    }
    
    // Authorization header'ından token al
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      )
    }

    const token = authHeader.replace("Bearer ", "")
    
    // Kullanıcı doğrulaması
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user || user.id !== userId) {
      console.error("User validation failed:", { error, user: user?.id, userId })
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    console.log("Generating Etsy auth URL for user:", userId)
    
    // Etsy auth URL'ini oluştur
    const authUrl = await getEtsyAuthUrl(userId)
    
    return NextResponse.json({ authUrl })
    
  } catch (error) {
    console.error("Etsy auth error:", error)
    return NextResponse.json(
      { error: String(error) || "Failed to generate auth URL" },
      { status: 500 }
    )
  }
}

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
