import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Firebase geçişi sonrası mock response
    return NextResponse.json({ 
      message: "Token cleanup will be implemented with Firebase",
      cleaned: 0
    });
    
  } catch (error) {
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}