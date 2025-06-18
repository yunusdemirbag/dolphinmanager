import { NextRequest, NextResponse } from 'next/server';
import { startQueueProcessorService, isQueueProcessorRunning } from '@/lib/queue-processor';

export const runtime = 'nodejs';

// Bu endpoint, kuyruk işlemcisini başlatır
export async function GET(request: NextRequest) {
  try {
    // API key kontrolü (opsiyonel güvenlik önlemi)
    const apiKey = request.nextUrl.searchParams.get('api_key');
    const validApiKey = process.env.QUEUE_PROCESSOR_API_KEY;
    
    // API key kontrol edilebilir (opsiyonel)
    if (validApiKey && apiKey !== validApiKey) {
      console.error('❌ Geçersiz API key');
      return NextResponse.json(
        { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    // İşlemci zaten çalışıyorsa bilgi ver
    if (isQueueProcessorRunning()) {
      return NextResponse.json({
        success: true,
        message: 'Kuyruk işlemcisi zaten çalışıyor'
      });
    }
    
    // İşlem aralığını al (ms cinsinden)
    const intervalMs = parseInt(request.nextUrl.searchParams.get('interval') || '120000', 10);
    
    // Kuyruk işlemcisini başlat
    startQueueProcessorService(intervalMs);
    
    return NextResponse.json({
      success: true,
      message: `Kuyruk işlemcisi başlatıldı (${intervalMs}ms aralıkla)`,
      interval: intervalMs
    });
    
  } catch (error: any) {
    console.error('💥 KUYRUK İŞLEMCİ BAŞLATMA HATASI:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Bilinmeyen hata',
        code: 'PROCESSOR_ERROR',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 