import { NextResponse } from 'next/server';
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Supabase şimdilik kaldırıldı
// import { cookies } from 'next/headers'; // Supabase şimdilik kaldırıldı
import { getShippingProfiles, getEtsyStores } from '@/lib/etsy-api';
import { createClient } from '@/lib/supabase/server';

// Frontend'in beklediği Hazırlık Süresi Seçeneği formatı
interface ProcessingProfileOption {
  id: string; 
  label: string; 
  min_processing_time: number;
  max_processing_time: number;
  processing_time_unit: string;
}

// Processing profillerini listele - aslında shipping profilelardan çekiyoruz
export async function GET() {
  try {
    console.log('[PROCESSING-PROFILES-ROUTE] Starting to fetch processing profiles...');

    // Get user from session using the updated createClient function
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[PROCESSING-PROFILES-ROUTE] No user found:', userError);
      return NextResponse.json(
        { error: 'Etsy hesabınıza erişim yetkisi bulunamadı. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }

    console.log('[PROCESSING-PROFILES-ROUTE] User found:', user.id);

    // Mağaza ID'sini almak için önce etsy_auth tablosuna bak
    let shopId: number | null = null;

    // 1. İlk olarak etsy_auth tablosundan mağaza ID'sini kontrol et
    const { data: etsyAuth, error: etsyAuthError } = await supabase
      .from('etsy_auth')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (etsyAuthError) {
      console.log('[PROCESSING-PROFILES-ROUTE] etsy_auth tablosundan mağaza ID alınamadı, Etsy API\'den alınacak:', etsyAuthError);
    } else if (etsyAuth?.shop_id) {
      // Eğer string ise sayıya dönüştür, sayı ise direkt kullan
      shopId = typeof etsyAuth.shop_id === 'string' ? parseInt(etsyAuth.shop_id) : etsyAuth.shop_id;
      console.log('[PROCESSING-PROFILES-ROUTE] etsy_auth tablosundan mağaza ID alındı:', shopId);
    }

    // 2. Eğer etsy_auth'tan mağaza ID'si alınamazsa, Etsy API'den getir
    if (!shopId) {
      console.log('[PROCESSING-PROFILES-ROUTE] Etsy API\'den mağaza bilgileri alınıyor...');
      try {
        const stores = await getEtsyStores(user.id);
        if (stores && stores.length > 0) {
          shopId = stores[0].shop_id;
          console.log('[PROCESSING-PROFILES-ROUTE] Etsy API\'den mağaza ID alındı:', shopId);

          // Mağaza bilgisini etsy_auth tablosuna kaydet
          const { error: updateError } = await supabase
            .from('etsy_auth')
            .upsert({
              user_id: user.id,
              shop_id: shopId.toString(),
              shop_name: stores[0].shop_name,
              updated_at: new Date().toISOString()
            });

          if (updateError) {
            console.error('[PROCESSING-PROFILES-ROUTE] etsy_auth tablosu güncellenemedi:', updateError);
          } else {
            console.log('[PROCESSING-PROFILES-ROUTE] etsy_auth tablosu güncellendi');
          }
        }
      } catch (storeError) {
        console.error('[PROCESSING-PROFILES-ROUTE] Etsy API\'den mağaza bilgileri alınamadı:', storeError);
      }
    }

    // Hala mağaza ID'si yoksa hata döndür
    if (!shopId) {
      console.error('[PROCESSING-PROFILES-ROUTE] Hiçbir kaynaktan mağaza ID\'si alınamadı');
      return NextResponse.json(
        { error: 'Etsy mağaza bilgisi bulunamadı. Lütfen mağaza bağlantınızı kontrol edin.' },
        { status: 404 }
      );
    }

    console.log('[PROCESSING-PROFILES-ROUTE] Shop ID found and verified:', shopId);

    try {
      // Kargo profillerini çek (içinde processing time bilgisi var)
      console.log('[PROCESSING-PROFILES-ROUTE] Fetching shipping profiles for shop:', shopId);
      const shippingProfiles = await getShippingProfiles(user.id, shopId);
      
      if (!shippingProfiles || !Array.isArray(shippingProfiles)) {
        console.error('[PROCESSING-PROFILES-ROUTE] Invalid shipping profiles response:', shippingProfiles);
        return NextResponse.json(
          { error: 'İşlem profilleri alınamadı. Lütfen Etsy mağazanızı kontrol edin.' },
          { status: 500 }
        );
      }

      if (shippingProfiles.length === 0) {
        console.log('[PROCESSING-PROFILES-ROUTE] No shipping profiles found');
        // Etsy API sınırlamaları nedeniyle burada varsayılan bir profil oluşturuyoruz
        const defaultProfiles = [
          {
            processing_profile_id: 0,
            title: 'Varsayılan İşlem Profili',
            user_id: 0,
            min_processing_days: 1,
            max_processing_days: 3,
            processing_days_display_label: '1-3 gün',
            is_deleted: false
          }
        ];
        
        console.log('[PROCESSING-PROFILES-ROUTE] Using default processing profiles');
        return NextResponse.json({ profiles: defaultProfiles });
      }

      // Shipping profilelardan processing profilleri oluştur
      const processingProfiles = shippingProfiles.map(profile => ({
        processing_profile_id: profile.shipping_profile_id,
        title: profile.title,
        user_id: profile.user_id,
        min_processing_days: profile.min_processing_days,
        max_processing_days: profile.max_processing_days,
        processing_days_display_label: `${profile.min_processing_days}-${profile.max_processing_days} gün`,
        is_deleted: false
      }));

      console.log('[PROCESSING-PROFILES-ROUTE] Successfully created processing profiles from shipping profiles:', processingProfiles.length);
      return NextResponse.json({ profiles: processingProfiles });
    } catch (error: any) {
      // Özel hata durumlarını kontrol et
      if (error?.message === 'RECONNECT_REQUIRED') {
        console.error('[PROCESSING-PROFILES-ROUTE] Etsy reconnection required');
        return NextResponse.json(
          { error: 'Etsy hesabınıza erişim yetkisi bulunamadı. Lütfen tekrar giriş yapın.' },
          { status: 401 }
        );
      }

      // Diğer API hataları
      console.error('[PROCESSING-PROFILES-ROUTE] Error fetching shipping profiles:', error);
      
      // Burada da varsayılan profil döndürüyoruz, hata durumunda bile çalışabilmesi için
      const defaultProfiles = [
        {
          processing_profile_id: 0,
          title: 'Varsayılan İşlem Profili',
          user_id: 0,
          min_processing_days: 1,
          max_processing_days: 3,
          processing_days_display_label: '1-3 gün',
          is_deleted: false
        }
      ];
      
      console.log('[PROCESSING-PROFILES-ROUTE] Using default processing profiles after error');
      return NextResponse.json({ profiles: defaultProfiles });
    }
  } catch (error: any) {
    // Detaylı hata loglaması
    console.error('[PROCESSING-PROFILES-ROUTE] Detailed error in processing profiles:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause
    });

    // Özel hata mesajları
    let errorMessage = 'İşlem profilleri yüklenirken bir hata oluştu';
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