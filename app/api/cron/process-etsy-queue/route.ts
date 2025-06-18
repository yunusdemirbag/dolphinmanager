import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    // API anahtarını kontrol et
    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json(
        { success: false, message: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    // Kuyruk işleme API'sini çağır
    const processResponse = await fetch(new URL('/api/etsy/listings/queue/process', req.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const processResult = await processResponse.json();
    
    // Başarılı yanıt
    return NextResponse.json({
      success: true,
      message: "Kuyruk işleme tamamlandı",
      result: processResult
    });
    
  } catch (error: any) {
    console.error("Cron işleme hatası:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Cron işlenirken bir hata oluştu",
        error: error.message
      },
      { status: 500 }
    );
  }
} 