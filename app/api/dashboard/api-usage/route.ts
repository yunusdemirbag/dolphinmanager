import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Kullanıcı kimliğini doğrula
    const user = await getUser();
    
    if (!user?.id) {
      return NextResponse.json(
        { error: "Yetkilendirme hatası" },
        { status: 401 }
      );
    }
    
    // URL parametrelerini al
    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7"); // Varsayılan olarak son 7 gün
    const endpoint = searchParams.get("endpoint") || null;
    
    // Başlangıç tarihi hesapla
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();
    
    // Temel sorgu
    let query = supabaseAdmin
      .from("api_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("timestamp", startDateStr)
      .order("timestamp", { ascending: false });
    
    // Endpoint filtresi ekle
    if (endpoint) {
      query = query.eq("endpoint", endpoint);
    }
    
    // Sorguyu çalıştır
    const { data: logs, error } = await query;
    
    if (error) {
      console.error("API logs query error:", error);
      return NextResponse.json(
        { error: "Veritabanı hatası" },
        { status: 500 }
      );
    }
    
    // Toplam API çağrı sayısı
    const totalCalls = logs.length;
    
    // Başarılı ve başarısız çağrı sayıları
    const successfulCalls = logs.filter(log => log.success).length;
    const failedCalls = totalCalls - successfulCalls;
    
    // Ortalama yanıt süresi
    const totalDuration = logs.reduce((sum, log) => sum + (log.duration_ms || 0), 0);
    const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
    
    // Endpoint'lere göre dağılım
    const endpointDistribution: Record<string, number> = {};
    logs.forEach(log => {
      const ep = log.endpoint || "unknown";
      endpointDistribution[ep] = (endpointDistribution[ep] || 0) + 1;
    });
    
    // Günlük API çağrı sayısı
    const dailyUsage: Record<string, number> = {};
    logs.forEach(log => {
      const date = new Date(log.timestamp).toISOString().split("T")[0];
      dailyUsage[date] = (dailyUsage[date] || 0) + 1;
    });
    
    // Son 10 API çağrısı
    const recentCalls = logs
      .slice(0, 10)
      .map(log => ({
        endpoint: log.endpoint,
        timestamp: log.timestamp,
        success: log.success,
        duration_ms: log.duration_ms,
        status_code: log.status_code
      }));
    
    // AI API çağrıları (endpoint'i /api/ai/ ile başlayanlar)
    const aiCalls = logs.filter(log => log.endpoint?.startsWith("/api/ai/"));
    const aiCallsCount = aiCalls.length;
    
    // AI API çağrılarının dağılımı
    const aiDistribution: Record<string, number> = {};
    aiCalls.forEach(log => {
      const ep = log.endpoint || "unknown";
      aiDistribution[ep] = (aiDistribution[ep] || 0) + 1;
    });
    
    // Sonuçları döndür
    return NextResponse.json({
      totalCalls,
      successfulCalls,
      failedCalls,
      averageDuration,
      endpointDistribution,
      dailyUsage,
      recentCalls,
      aiCallsCount,
      aiDistribution,
      period: {
        days,
        startDate: startDateStr,
        endDate: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("API usage stats error:", error);
    return NextResponse.json(
      { error: "İstatistikler alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
} 