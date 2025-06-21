import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Firebase geçişi sonrası mock debug response
    const userId = "firebase-user-id"
    
    return NextResponse.json({
      userId,
      sessions: [],
      tokens: [],
      profile: null,
      env: {
        hasClientId: !!process.env.ETSY_CLIENT_ID,
        hasRedirectUri: !!process.env.ETSY_REDIRECT_URI,
        hasFirebaseKey: !!process.env.FIREBASE_PRIVATE_KEY,
        redirectUri: process.env.ETSY_REDIRECT_URI
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 