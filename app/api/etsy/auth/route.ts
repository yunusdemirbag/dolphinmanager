import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { getEtsyAuthUrl } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    // Kullanıcı doğrulama
    const user = await getUser()
    
    if (!user) {
      console.log("Auth error: No user found")
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

export async function POST(request: NextRequest) {
  try {
    // Kullanıcı doğrulama
    const user = await getUser()
    
    if (!user) {
      console.log("Auth error: No user found")
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
