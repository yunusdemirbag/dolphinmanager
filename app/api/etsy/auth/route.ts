import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { getEtsyAuthUrl } from "@/lib/etsy-api"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    const authUrl = await getEtsyAuthUrl(userId)
    
    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error("Etsy auth URL generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate auth URL", details: error.message },
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
    return NextResponse.json({ 
      error: "Failed to generate auth URL", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
