import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    // Kimlik doğrulama kontrolü
    const authResult = await authenticateRequest(request);
    
    // Geliştirme ortamında test verisi döndür
    return NextResponse.json({
      success: true,
      message: "Firebase geçişi sonrası mock endpoint - kuyruk debug",
      ozet: {
        toplam: 0,
        siradaBekleyen: 0,
        isleniyor: 0,
        yuklendi: 0,
        hata: 0
      },
      turkceKayitlar: [],
      recent_items: []
    });

  } catch (error) {
    console.error('Kuyruk debug endpoint hatası:', error);
    return NextResponse.json({ 
      error: 'Firebase geçişi sonrası mock endpoint', 
      details: 'Debug API Firebase ile entegre edilecek' 
    }, { status: 200 });
  }
}