import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    // Firebase geçişi sonrası mock response
    return NextResponse.json({
      message: "Etsy login will be implemented with Firebase",
      redirectUrl: "/auth/login"
    });
    
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}