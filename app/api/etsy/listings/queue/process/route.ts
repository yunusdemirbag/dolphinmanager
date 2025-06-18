import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { processNextJob } from '@/lib/queue-manager';

export const runtime = 'nodejs';

// Bu endpoint, cron job tarafından çağrılacak
export async function GET(request: NextRequest) {
  console.log('🔄 KUYRUK İŞLEME BAŞLADI');
  
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
    
    // Bir sonraki işi işle
    const job = await processNextJob();
    
    if (job) {
      return NextResponse.json({
        success: true,
        message: 'İş başarıyla işlendi',
        job_id: job.id,
        job_type: job.type,
        job_status: job.status
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'İşlenecek iş bulunamadı veya işlem başarısız oldu'
      });
    }
    
  } catch (error: any) {
    console.error('💥 KUYRUK İŞLEME HATASI:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Bilinmeyen hata',
        code: 'PROCESSING_ERROR',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 