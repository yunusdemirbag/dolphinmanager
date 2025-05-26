import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { getEtsyDataWithRefreshControl, toggleCachedDataOnlyMode } from "@/lib/etsy-api"
import { supabaseAdmin } from "@/lib/supabase"
import { updateRateLimitInfo } from "@/lib/api-utils"

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
    
    // Son yenileme zamanını kontrol et
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("last_sync_attempt_at")
      .eq("id", userId)
      .single();
    
    if (!profileError && profileData?.last_sync_attempt_at) {
      const lastSyncAttempt = new Date(profileData.last_sync_attempt_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSyncAttempt.getTime()) / (1000 * 60);
      
      // Eğer son 5 dakika içinde yenileme yapıldıysa ve forceRefresh true değilse hata döndür
      if (diffMinutes < 5 && !forceRefresh) {
        return NextResponse.json({
          success: false,
          message: `Son yenilemeden bu yana yeterli süre geçmedi (${Math.round(diffMinutes)} dakika). 5 dakika sonra tekrar deneyin.`,
          lastSync: lastSyncAttempt,
          canRefresh: false,
          timestamp: Date.now()
        });
      }
    }
    
    // Yenileme zamanını güncelle
    await supabaseAdmin
      .from("profiles")
      .update({
        last_sync_attempt_at: new Date().toISOString()
      })
      .eq("id", userId);
    
    // Temporarily disable cached-only mode to allow real API calls
    toggleCachedDataOnlyMode(false);
    
    try {
      // Etsy verilerini yenile
      const result = await getEtsyDataWithRefreshControl(
        userId,
        shopId,
        forceRefresh
      );
      
      // For each API call, update the rate limit counter
      // Rough estimate that this involves about 3-5 API calls
      await updateRateLimitInfo(5);
      
      return NextResponse.json(result);
    } finally {
      // Re-enable cached-only mode after the refresh
      toggleCachedDataOnlyMode(true);
    }
  } catch (error) {
    console.error("Veri yenileme hatası:", error);
    
    // Re-enable cached-only mode in case of error
    toggleCachedDataOnlyMode(true);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Veri yenileme sırasında beklenmeyen bir hata oluştu",
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
} 