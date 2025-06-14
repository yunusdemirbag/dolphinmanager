import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// API istek loglarını veritabanına kaydetmek için yardımcı fonksiyon
async function logApiRequest(req: NextRequest, res: NextResponse, durationMs: number, error?: any) {
  try {
    // API endpoint'ini al
    const url = new URL(req.url);
    const endpoint = url.pathname;
    
    // Sadece /api ile başlayan istekleri logla
    if (!endpoint.startsWith('/api')) {
      return;
    }
    
    // AI API istekleri zaten kendi içlerinde loglanıyor, mükerrer kayıt olmasın
    if (endpoint.startsWith('/api/ai/')) {
      return;
    }
    
    // İstek detaylarını topla
    const method = req.method;
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const referer = req.headers.get('referer') || 'unknown';
    const contentType = req.headers.get('content-type') || 'unknown';
    const status = res.status;
    const success = status >= 200 && status < 300;
    
    // Kullanıcı kimliğini almaya çalış
    let userId = null;
    
    // API log kaydını oluştur
    await supabaseAdmin
      .from("api_logs")
      .insert({
        endpoint,
        method,
        user_id: userId,
        timestamp: new Date().toISOString(),
        success,
        duration_ms: durationMs,
        status_code: status,
        details: {
          user_agent: userAgent,
          referer: referer,
          content_type: contentType,
          error: error ? String(error) : undefined
        }
      });
    
    console.log(`[API Log] ${method} ${endpoint} - ${status} - ${durationMs}ms`);
  } catch (logError) {
    console.error("API log kaydederken hata:", logError);
  }
}

// Middleware fonksiyonu
export async function middleware(req: NextRequest) {
  // İstek başlangıç zamanını kaydet
  const startTime = Date.now();
  
  // İsteği normal şekilde devam ettir
  const res = NextResponse.next();
  
  try {
    // İstek tamamlandıktan sonra süreyi hesapla ve logla
    const durationMs = Date.now() - startTime;
    await logApiRequest(req, res, durationMs);
  } catch (error) {
    console.error("API middleware hatası:", error);
    
    // Hata durumunda da loglama yap
    try {
      const durationMs = Date.now() - startTime;
      await logApiRequest(req, res, durationMs, error);
    } catch (logError) {
      console.error("Hata loglarken ikincil hata:", logError);
    }
  }
  
  return res;
}

// Middleware'in çalışacağı route'ları belirle
export const config = {
  matcher: '/api/:path*',
}; 