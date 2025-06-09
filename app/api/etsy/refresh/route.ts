import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { refreshEtsyToken } from "@/lib/etsy-api"

/**
 * Etsy API verilerini yenileyen endpoint
 * Bu endpoint, önbellek verilerini temizleyip yeni veri çeker
 */
export async function POST(request: NextRequest) {
  try {
    // Kullanıcı doğrulaması
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Token refresh API auth error:", userError)
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      )
    }
    
    try {
      // Token yenileme işlemi
      const newAccessToken = await refreshEtsyToken(user.id)
      
      if (!newAccessToken) {
        return NextResponse.json(
          { 
            error: "Failed to refresh token",
            reconnectRequired: true
          }, 
          { status: 401 }
        )
      }
      
      return NextResponse.json({
        success: true,
        access_token: newAccessToken.substring(0, 10) + "..." // Token'ın sadece ilk 10 karakterini gönder, güvenlik için
      })
    } catch (error: any) {
      console.error("Etsy token refresh API error:", error)
      
      // Yeniden bağlantı gerektiren hata kontrolü
      if (error.message === 'RECONNECT_REQUIRED' || 
          error.message.includes('invalid_grant') ||
          error.message.includes('refresh_token')) {
        return NextResponse.json(
          { 
            error: "OAuth2 refresh token expired or invalid",
            reconnectRequired: true 
          }, 
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { 
          error: error.message || "Failed to refresh Etsy token",
          details: error.details || null
        }, 
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Etsy token refresh API server error:", error)
    
    return NextResponse.json(
      { error: "Server error" }, 
      { status: 500 }
    )
  }
} 