import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { getEtsyAuthUrl } from "@/lib/etsy-api"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log("Auth error:", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Generating Etsy auth URL for user:", user.id)
    
    // Etsy auth URL'ini oluştur
    const authUrl = await getEtsyAuthUrl(user.id)
    
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
    const supabase = createRouteHandlerClient({ cookies })
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log("Auth error:", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Generating Etsy auth URL for user:", user.id)
    
    const authUrl = await getEtsyAuthUrl(user.id)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error("Etsy auth error:", error)
    return NextResponse.json({ error: "Failed to generate auth URL" }, { status: 500 })
  }
}
