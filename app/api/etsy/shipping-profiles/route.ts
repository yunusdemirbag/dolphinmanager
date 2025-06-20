import { NextResponse } from 'next/server';
import { getShippingProfiles, createShippingProfile, getEtsyStores } from '@/lib/etsy-api';
// import { createClient } from '@/lib/supabase/server';

// Kargo profillerini listele
export async function GET() {
  try {
    console.log('API: Starting to fetch shipping profiles...');

    // Get user from session
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('API: No user found:', userError);
      return NextResponse.json(
        { error: 'Etsy hesabınıza erişim yetkisi bulunamadı. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }

    console.log('API: User found:', user.id);

    // Mağaza ID'sini almak için önce etsy_auth tablosuna bak
    let shopId: number | null = null;

    // 1. İlk olarak etsy_auth tablosundan mağaza ID'sini kontrol et
    const { data: etsyAuth, error: etsyAuthError } = await supabase
      .from('etsy_auth')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (etsyAuthError) {
      console.log('API: etsy_auth tablosundan mağaza ID alınamadı, Etsy API\'den alınacak:', etsyAuthError);
    } else if (etsyAuth?.shop_id) {
      // Eğer string ise sayıya dönüştür, sayı ise direkt kullan
      shopId = typeof etsyAuth.shop_id === 'string' ? parseInt(etsyAuth.shop_id) : etsyAuth.shop_id;
      console.log('API: etsy_auth tablosundan mağaza ID alındı:', shopId);
    }

    // 2. Eğer etsy_auth'tan mağaza ID'si alınamazsa, Etsy API'den getir
    if (!shopId) {
      console.log('API: Etsy API\'den mağaza bilgileri alınıyor...');
      try {
        const stores = await getEtsyStores(user.id);
        if (stores && stores.length > 0) {
          shopId = stores[0].shop_id;
          console.log('API: Etsy API\'den mağaza ID alındı:', shopId);

          // Mağaza bilgisini etsy_auth tablosuna kaydet
          const { error: updateError } = await supabase
            .from('etsy_auth')
            .upsert({
              user_id: user.id,
              shop_id: shopId.toString(),
              shop_name: stores[0].shop_name,
              last_updated: new Date().toISOString()
            });

          if (updateError) {
            console.error('API: etsy_auth tablosu güncellenemedi:', updateError);
          } else {
            console.log('API: etsy_auth tablosu güncellendi');
          }
        }
      } catch (storeError) {
        console.error('API: Etsy API\'den mağaza bilgileri alınamadı:', storeError);
      }
    }

    // Hala mağaza ID'si yoksa hata döndür
    if (!shopId) {
      console.error('API: Hiçbir kaynaktan mağaza ID\'si alınamadı');
      return NextResponse.json(
        { error: 'Etsy mağaza bilgisi bulunamadı. Lütfen mağaza bağlantınızı kontrol edin.' },
        { status: 404 }
      );
    }

    console.log('API: Shop ID found and verified:', shopId);

    try {
      // Fetch shipping profiles
      console.log('API: Fetching shipping profiles for shop:', shopId);
      const profiles = await getShippingProfiles(user.id, shopId);
      
      if (!profiles || !Array.isArray(profiles)) {
        console.error('API: Invalid profiles response:', profiles);
        return NextResponse.json(
          { error: 'Kargo profilleri alınamadı. Lütfen Etsy mağazanızı kontrol edin.' },
          { status: 500 }
        );
      }

      if (profiles.length === 0) {
        console.log('API: No shipping profiles found');
        return NextResponse.json(
          { error: 'Etsy mağazanızda kargo profili bulunamadı. Lütfen önce Etsy\'de bir kargo profili oluşturun.' },
          { status: 404 }
        );
      }

      console.log('API: Successfully fetched profiles:', profiles.length);
      return NextResponse.json({ profiles });
    } catch (error: any) {
      // Özel hata durumlarını kontrol et
      if (error?.message === 'RECONNECT_REQUIRED') {
        console.error('API: Etsy reconnection required');
        return NextResponse.json(
          { error: 'Etsy hesabınıza erişim yetkisi bulunamadı. Lütfen tekrar giriş yapın.' },
          { status: 401 }
        );
      }

      // Diğer API hataları
      console.error('API: Error fetching shipping profiles:', error);
      return NextResponse.json(
        { error: 'Kargo profilleri alınamadı. Lütfen daha sonra tekrar deneyin.' },
        { status: 500 }
      );
    }
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

    if (error?.message?.includes('RECONNECT_REQUIRED') || error?.message?.includes('401')) {
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
    } else if (error?.message?.includes('Shop ID is missing')) {
      errorMessage = 'Etsy mağaza bilgisi eksik. Lütfen mağaza bağlantınızı kontrol edin.';
      statusCode = 400;
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
    // Get user from session
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('API: No user found:', userError);
      return NextResponse.json(
        { error: 'Etsy hesabınıza erişim yetkisi bulunamadı. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }

    // Mağaza ID'sini al
    let shopId: number | null = null;

    // 1. İlk olarak etsy_auth tablosundan mağaza ID'sini kontrol et
    const { data: etsyAuth, error: etsyAuthError } = await supabase
      .from('etsy_auth')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (!etsyAuthError && etsyAuth?.shop_id) {
      shopId = typeof etsyAuth.shop_id === 'string' ? parseInt(etsyAuth.shop_id) : etsyAuth.shop_id;
    } else {
      // 2. Eğer etsy_auth'tan mağaza ID'si alınamazsa, Etsy API'den getir
      try {
        const stores = await getEtsyStores(user.id);
        if (stores && stores.length > 0) {
          shopId = stores[0].shop_id;
        }
      } catch (storeError) {
        console.error('API: Etsy API\'den mağaza bilgileri alınamadı:', storeError);
      }
    }

    if (!shopId) {
      return NextResponse.json(
        { error: 'Etsy mağaza bilgisi bulunamadı. Lütfen mağaza bağlantınızı kontrol edin.' },
        { status: 404 }
      );
    }

    const data = await request.json();
    const profile = await createShippingProfile(user.id, shopId, data);
    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Error creating shipping profile:', error);
    
    let errorMessage = 'Kargo profili oluşturulurken bir hata oluştu';
    let statusCode = 500;

    if (error?.message?.includes('RECONNECT_REQUIRED') || error?.message?.includes('401')) {
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