import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { getEtsyDataWithRefreshControl } from "@/lib/etsy-api"

/**
 * Etsy API verilerini yenileyen endpoint
 * Bu endpoint, önbellek verilerini temizleyip yeni veri çeker
 */
export async function POST(request: NextRequest) {
  try {
    // Kullanıcı kimliğini doğrula
    const user = await getUser()
    
    if (!user?.id) {
      return NextResponse.json(
        { error: "Yetkilendirme hatası" },
        { status: 401 }
      )
    }
    
    const userId = user.id
    
    // Request body'den parametreleri al
    const data = await request.json().catch(() => ({}))
    const { shopId, forceRefresh = true } = data
    
    console.log(`Etsy verilerini yenileme isteği: kullanıcı=${userId}, mağaza=${shopId || 'tümü'}, force=${forceRefresh}`)
    
    // Etsy verilerini yenile
    const result = await getEtsyDataWithRefreshControl(
      userId,
      shopId,
      forceRefresh
    )
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("Veri yenileme hatası:", error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Veri yenileme sırasında beklenmeyen bir hata oluştu",
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
} 