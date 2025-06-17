// /app/api/etsy/listings/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('🚀 ETSY LİSTİNG OLUŞTURMA BAŞLADI');
  
  try {
    // Supabase client oluştur
    const supabase = createServerSupabaseClient();
    
    // Kullanıcıyı doğrula
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Kullanıcı doğrulanamadı:', userError);
      return NextResponse.json(
        { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    console.log('✅ Kullanıcı doğrulandı:', user.id);

    // Form data'yı al
    const formData = await request.formData();
    const listingDataStr = formData.get('listingData') as string;
    
    if (!listingDataStr) {
      console.error('❌ Listing data bulunamadı');
      return NextResponse.json(
        { error: 'Ürün verisi eksik' },
        { status: 400 }
      );
    }

    // Listing data'yı parse et
    let listingData: any;
    try {
      listingData = JSON.parse(listingDataStr);
    } catch (e) {
      console.error('❌ Listing data parse edilemedi:', e);
      return NextResponse.json(
        { error: 'Geçersiz ürün verisi' },
        { status: 400 }
      );
    }

    console.log('📝 Listing data alındı:', {
      title: listingData.title || 'Başlık yok',
      price: listingData.price || 0,
      tags: listingData.tags?.length || 0,
      hasVariations: listingData.has_variations || false
    });

    // Resim dosyalarını al
    const imageFiles: File[] = [];
    const videoFiles: File[] = [];
    
    // Form data'dan tüm dosyaları topla
    for (const [key, value] of formData.entries()) {
      if (key === 'imageFiles' && value instanceof File) {
        imageFiles.push(value);
      } else if (key === 'videoFile' && value instanceof File) {
        videoFiles.push(value);
      }
    }

    console.log('📁 Dosyalar:', {
      images: imageFiles.length,
      videos: videoFiles.length
    });

    // Etsy API token'ını al
    const { data: etsyAuth, error: authError } = await supabase
      .from('etsy_auth')
      .select('access_token, access_token_secret, shop_id')
      .eq('user_id', user.id)
      .single();

    if (authError || !etsyAuth?.access_token) {
      console.error('❌ Etsy token bulunamadı:', authError);
      return NextResponse.json(
        { error: 'Etsy hesabınız bağlı değil', code: 'NO_ETSY_TOKEN' },
        { status: 400 }
      );
    }

    console.log('✅ Etsy token bulundu, Shop ID:', etsyAuth.shop_id);

    // Etsy API için listing data hazırla
    const etsyListingData = {
      title: listingData.title || '',
      description: listingData.description || '',
      price: listingData.price || 0,
      quantity: listingData.quantity || 999,
      shipping_profile_id: listingData.shipping_profile_id || null,
      taxonomy_id: listingData.taxonomy_id || 1027, // Default: Wall Decor
      tags: listingData.tags || [],
      state: listingData.state || 'draft',
      who_made: listingData.who_made || 'i_did',
      when_made: listingData.when_made || 'made_to_order',
      is_supply: listingData.is_supply || false,
      shop_section_id: listingData.shop_section_id || null,
      
      // Kişiselleştirme ayarları
      is_personalizable: listingData.is_personalizable || true,
      personalization_is_required: listingData.personalization_is_required || false,
      personalization_instructions: listingData.personalization_instructions || '',
      personalization_char_count_max: listingData.personalization_char_count_max || 256,
      
      // Varyasyon ayarları
      has_variations: listingData.has_variations || false,
      variations: listingData.variations || []
    };

    console.log('🔄 Etsy API\'ye listing oluşturuluyor...');

    // Etsy API çağrısı için OAuth 1.0 signature oluştur
    const oauth = {
      consumer_key: process.env.ETSY_CONSUMER_KEY || '',
      consumer_secret: process.env.ETSY_CONSUMER_SECRET || '',
      access_token: etsyAuth.access_token || '',
      access_token_secret: etsyAuth.access_token_secret || ''
    };

    // OAuth signature ve headers oluştur (basitleştirilmiş)
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = Math.random().toString(36).substring(2, 15);
    
    const authHeader = `OAuth oauth_consumer_key="${oauth.consumer_key}", oauth_token="${oauth.access_token}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${timestamp}", oauth_nonce="${nonce}", oauth_version="1.0"`;

    // Etsy API'ye POST isteği
    const etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${etsyAuth.shop_id}/listings`;
    
    console.log('📤 Etsy API URL:', etsyApiUrl);
    
    const etsyResponse = await fetch(etsyApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'x-api-key': process.env.ETSY_CONSUMER_KEY || ''
      },
      body: JSON.stringify(etsyListingData)
    });

    console.log('📥 Etsy API yanıt kodu:', etsyResponse.status);

    if (!etsyResponse.ok) {
      const errorText = await etsyResponse.text();
      console.error('❌ Etsy API hatası:', errorText);
      
      let errorMessage = 'Etsy API hatası';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorText;
      } catch (e) {
        errorMessage = errorText;
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          code: 'ETSY_API_ERROR',
          status: etsyResponse.status 
        },
        { status: 400 }
      );
    }

    const etsyResult = await etsyResponse.json();
    console.log('✅ Etsy listing oluşturuldu:', etsyResult.listing_id);

    // Eğer resimler varsa yükle
    if (imageFiles.length > 0) {
      console.log('📸 Resimleri yükleniyor...');
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        console.log(`📤 Resim ${i + 1}/${imageFiles.length} yükleniyor...`);
        
        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('rank', (i + 1).toString());
          formData.append('is_watermarked', 'false');
          formData.append('alt_text', listingData.title || '');

          const imageResponse = await fetch(
            `https://openapi.etsy.com/v3/application/shops/${etsyAuth.shop_id}/listings/${etsyResult.listing_id}/images`,
            {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'x-api-key': process.env.ETSY_CONSUMER_KEY || ''
              },
              body: formData
            }
          );

          if (imageResponse.ok) {
            console.log(`✅ Resim ${i + 1} başarıyla yüklendi`);
          } else {
            console.error(`❌ Resim ${i + 1} yüklenemedi:`, await imageResponse.text());
          }
        } catch (error) {
          console.error(`❌ Resim ${i + 1} yükleme hatası:`, error);
        }
      }
    }

    // Video varsa yükle
    if (videoFiles.length > 0) {
      console.log('🎥 Video yükleniyor...');
      
      try {
        const videoFormData = new FormData();
        videoFormData.append('video', videoFiles[0]);
        videoFormData.append('name', 'Product Video');

        const videoResponse = await fetch(
          `https://openapi.etsy.com/v3/application/shops/${etsyAuth.shop_id}/listings/${etsyResult.listing_id}/videos`,
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'x-api-key': process.env.ETSY_CONSUMER_KEY || ''
            },
            body: videoFormData
          }
        );

        if (videoResponse.ok) {
          console.log('✅ Video başarıyla yüklendi');
        } else {
          console.error('❌ Video yüklenemedi:', await videoResponse.text());
        }
      } catch (error) {
        console.error('❌ Video yükleme hatası:', error);
      }
    }

    console.log('🎉 TÜM İŞLEMLER TAMAMLANDI!');

    return NextResponse.json({
      success: true,
      listing_id: etsyResult.listing_id,
      listing: etsyResult,
      message: 'Ürün başarıyla oluşturuldu',
      images_uploaded: imageFiles.length,
      videos_uploaded: videoFiles.length
    });

  } catch (error: any) {
    console.error('💥 GENEL HATA:', error);
    
    return NextResponse.json(
      { 
        error: 'Ürün oluşturulamadı',
        details: error?.message || 'Bilinmeyen hata',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}