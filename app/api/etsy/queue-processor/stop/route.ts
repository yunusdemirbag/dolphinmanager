import { NextRequest, NextResponse } from 'next/server';
import { stopQueueProcessorService, isQueueProcessorRunning } from '@/lib/queue-processor';

export const runtime = 'nodejs';

// Bu endpoint, kuyruk işlemcisini durdurur
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
    
    // İşlemci zaten durdurulmuşsa bilgi ver
    if (!isQueueProcessorRunning()) {
      return NextResponse.json({
        success: true,
        message: 'Kuyruk işlemcisi zaten durdurulmuş'
      });
    }
    
    // Kuyruk işlemcisini durdur
    stopQueueProcessorService();
    
    return NextResponse.json({
      success: true,
      message: 'Kuyruk işlemcisi durduruldu'
    });
    
  } catch (error: any) {
    console.error('💥 KUYRUK İŞLEMCİ DURDURMA HATASI:', error);
    
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