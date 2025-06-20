import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
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
    return NextResponse.json({ 
      error: 'Firebase geçişi sonrası mock endpoint', 
      details: 'Debug API Firebase ile entegre edilecek' 
    }, { status: 200 });
  }
}