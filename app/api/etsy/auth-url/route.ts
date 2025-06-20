import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { getEtsyAuthUrl } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    // Kullanıcı doğrulama
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const url = await getEtsyAuthUrl(user.id)
    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate auth URL", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
} 