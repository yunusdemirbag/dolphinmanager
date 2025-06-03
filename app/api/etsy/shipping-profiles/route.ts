import { NextResponse } from 'next/server';
import { getEtsyClient } from '@/lib/etsy';

// Kargo profillerini listele
export async function GET() {
  try {
    console.log('API: Getting Etsy client...');
    const etsy = await getEtsyClient();
    
    if (!etsy) {
      console.error('API: Etsy client is null');
      return NextResponse.json(
        { error: 'Etsy client initialization failed' },
        { status: 500 }
      );
    }

    console.log('API: Fetching shipping profiles...');
    const profiles = await etsy.getShippingProfiles();
    
    if (!profiles || !Array.isArray(profiles)) {
      console.error('API: Invalid profiles response:', profiles);
      return NextResponse.json(
        { error: 'Invalid shipping profiles response' },
        { status: 500 }
      );
    }

    console.log('API: Successfully fetched profiles:', profiles);
    return NextResponse.json({ profiles });
  } catch (error: any) {
    // Detaylı hata loglaması
    console.error('API: Detailed error in shipping profiles:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause
    });

    // Özel hata mesajları
    let errorMessage = 'Kargo profilleri yüklenirken bir hata oluştu';
    let statusCode = 500;

    if (error?.message?.includes('Unauthorized') || error?.message?.includes('401')) {
      errorMessage = 'Etsy hesabınıza erişim yetkisi bulunamadı. Lütfen tekrar giriş yapın.';
      statusCode = 401;
    } else if (error?.message?.includes('not found') || error?.message?.includes('404')) {
      errorMessage = 'Etsy mağaza bilgileriniz bulunamadı. Lütfen mağaza bağlantınızı kontrol edin.';
      statusCode = 404;
    } else if (error?.message?.includes('API error')) {
      errorMessage = 'Etsy API hatası: ' + error.message;
      statusCode = 502;
    } else if (error?.message?.includes('rate limit') || error?.message?.includes('429')) {
      errorMessage = 'Etsy API istek limiti aşıldı. Lütfen biraz bekleyip tekrar deneyin.';
      statusCode = 429;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// Yeni kargo profili oluştur
export async function POST(request: Request) {
  try {
    const etsy = await getEtsyClient();
    const data = await request.json();
    const profile = await etsy.createShippingProfile(data);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error creating shipping profile:', error);
    return NextResponse.json(
      { error: 'Kargo profili oluşturulurken bir hata oluştu' },
      { status: 500 }
    );
  }
} 