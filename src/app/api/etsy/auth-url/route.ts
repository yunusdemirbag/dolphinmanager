import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth"
import { getEtsyAuthUrl } from "@/lib/etsy-api"

// Node.js runtime kullan
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log("Etsy auth-url API called");
    
    // Kullanıcı doğrulama
    const user = await getAuthenticatedUser(request)
    if (!user) {
      console.log("Unauthorized: No valid user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    console.log("Authenticated user:", user.uid);
    
    try {
      const url = await getEtsyAuthUrl(user.uid)
      console.log("Generated Etsy auth URL:", url.substring(0, 100) + "...");
      return NextResponse.json({ url })
    } catch (urlError) {
      console.error("Error generating Etsy auth URL:", urlError);
      return NextResponse.json({ 
        error: "Failed to generate auth URL", 
        details: urlError instanceof Error ? urlError.message : "Unknown error" 
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in auth-url API:", error);
    return NextResponse.json({ 
      error: "Failed to process request", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
} 