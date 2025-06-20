import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Firebase geçişi sonrası mock rate limit data
    return NextResponse.json({
      used: 15,
      limit: 40,
      remaining: 25,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      percentage: 37
    });
    
  } catch (error) {
    return NextResponse.json({ error: "Rate limit check failed" }, { status: 500 })
  }
}