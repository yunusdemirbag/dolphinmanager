// /app/api/etsy/listings/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database.types";
import { 
  getValidAccessToken, 
  createDraftListing, 
  uploadFilesToEtsy, 
  addInventoryWithVariations 
} from "@/lib/etsy-api";

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('🚀 ETSY LİSTİNG OLUŞTURMA BAŞLADI');
  
  // Süre ölçümü için başlangıç zamanı
  const startTime = Date.now();
  
  try {
    // Supabase client oluştur - lib/supabase/server.ts'deki createClient fonksiyonunu kullan
    const supabase = await createClient();
    console.log('✅ Supabase client oluşturuldu');
    
    // Kullanıcıyı doğrula
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Oturum doğrulama hatası:', sessionError);
      return NextResponse.json(
        { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    if (!session || !session.user) {
      console.error('❌ Oturum bulunamadı');
      return NextResponse.json(
        { error: 'Yetkisiz erişim', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    console.log('✅ Kullanıcı doğrulandı:', userId);
    
    // Form verisini al
    const formData = await request.formData();
    
    // Listing verilerini JSON olarak parse et
    const listingDataStr = formData.get('listingData');
    if (!listingDataStr || typeof listingDataStr !== 'string') {
      console.error('❌ Listing verisi bulunamadı');
      return NextResponse.json(
        { error: 'Listing verisi bulunamadı', code: 'MISSING_DATA' },
        { status: 400 }
      );
    }
    
    const listingData = JSON.parse(listingDataStr);
    console.log('📝 Listing data alındı:', {
      title: listingData.title,
      price: listingData.price,
      tags: listingData.tags?.length,
      hasVariations: listingData.has_variations
    });
    
    // Dosyaları kontrol et
    const imageFiles = formData.getAll('imageFiles');
    const videoFiles = formData.getAll('videoFiles');
    
    console.log('📁 Dosyalar:', { 
      images: imageFiles.length, 
      videos: videoFiles.length 
    });
    
    // Etsy mağaza bilgisini al
    console.log('🔍 Etsy mağaza bilgisi alınıyor...');
    
    // Önce direkt SQL sorgusu ile mağaza bilgisini almayı deneyelim
    const { data: storeData, error: storeError } = await supabase
      .from('etsy_stores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (storeError || !storeData) {
      console.warn('⚠️ Etsy mağaza bilgisi bulunamadı, mağaza senkronizasyonu deneniyor...');
      
      // Mağaza bilgisini API'den almayı dene
      try {
        // Mağaza senkronizasyonu için API çağrısı yap
        // Cookie'leri doğru şekilde gönder
        const cookieHeader = request.headers.get('cookie');
        console.log('🍪 Cookie başlığı uzunluğu:', cookieHeader?.length || 0);
        
        const storesApiUrl = new URL('/api/etsy/stores', request.url);
        console.log('🔗 Mağaza senkronizasyon URL:', storesApiUrl.toString());
        
        const storesResponse = await fetch(storesApiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader || ''
          },
          credentials: 'include'
        });
        
        if (!storesResponse.ok) {
          const errorData = await storesResponse.json();
          console.error('❌ Mağaza senkronizasyonu başarısız:', {
            status: storesResponse.status,
            statusText: storesResponse.statusText,
            body: JSON.stringify(errorData)
          });
          
          // Mağaza senkronizasyonu başarısız oldu, tekrar mağaza bilgisini almayı dene
          const { data: retryStoreData, error: retryStoreError } = await supabase
            .from('etsy_stores')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
          if (retryStoreError) {
            console.error('❌ Etsy mağaza bilgisi bulunamadı:', retryStoreError);
            return NextResponse.json(
              { error: 'Etsy mağaza bilgisi bulunamadı', code: 'NO_STORE', details: retryStoreError },
              { status: 400 }
            );
          }
          
          // Eğer tekrar deneme başarılı olduysa, bu veriyi kullan
          if (retryStoreData) {
            console.log('✅ Tekrar deneme ile mağaza bilgisi alındı:', retryStoreData.shop_name);
          }
        } else {
          // Mağaza senkronizasyonu başarılı, tekrar mağaza bilgisini al
          const { data: refreshedStoreData, error: refreshedStoreError } = await supabase
            .from('etsy_stores')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
          if (refreshedStoreError) {
            console.error('❌ Güncellenmiş mağaza bilgisi alınamadı:', refreshedStoreError);
          } else if (refreshedStoreData) {
            console.log('✅ Güncellenmiş mağaza bilgisi alındı:', refreshedStoreData.shop_name);
          }
        }
      } catch (syncError) {
        console.error('❌ Mağaza senkronizasyonu sırasında hata:', syncError);
      }
      
      // Son bir kez daha mağaza bilgisini almayı dene
      const { data: finalStoreData, error: finalStoreError } = await supabase
        .from('etsy_stores')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (finalStoreError) {
        console.error('❌ Son kontrol: Etsy mağaza bilgisi bulunamadı:', finalStoreError);
        return NextResponse.json(
          { error: 'Etsy mağaza bilgisi bulunamadı', code: 'NO_STORE', details: finalStoreError },
          { status: 400 }
        );
      }
      
      if (finalStoreData) {
        console.log('✅ Son kontrol: Mağaza bilgisi alındı:', finalStoreData.shop_name);
      }
    } else {
      console.log('✅ Mağaza bilgisi alındı:', storeData.shop_name);
    }
    
    // Etsy API'ye istek yapma ve ürün oluşturma
    try {
      // Önce geçerli bir access token al
      const accessToken = await getValidAccessToken(userId);
      
      if (!accessToken) {
        console.error('❌ Etsy access token bulunamadı');
        return NextResponse.json(
          { error: 'Etsy hesabınıza erişim sağlanamadı. Lütfen yeniden bağlanın.', code: 'NO_ACCESS_TOKEN' },
          { status: 401 }
        );
      }
      
      // Mağaza bilgisini tekrar kontrol et
      const { data: storeData } = await supabase
        .from('etsy_stores')
        .select('shop_id, shop_name')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!storeData) {
        console.error('❌ Etsy mağaza bilgisi bulunamadı');
        return NextResponse.json(
          { error: 'Etsy mağaza bilgisi bulunamadı', code: 'NO_STORE' },
          { status: 400 }
        );
      }
      
      const shopId = storeData.shop_id;
      console.log(`🏪 Etsy mağazası: ${storeData.shop_name} (${shopId})`);
      
      // Listing verilerini hazırla
      const listingDataForEtsy = {
        title: listingData.title,
        description: listingData.description,
        price: listingData.price,
        quantity: listingData.quantity || 4,
        shipping_profile_id: listingData.shipping_profile_id,
        tags: listingData.tags,
        has_variations: listingData.has_variations,
        variations: listingData.variations,
        state: listingData.state || 'draft', // Varsayılan olarak draft
        taxonomy_id: listingData.taxonomy_id || 1027, // Varsayılan olarak Wall Decor
        shop_section_id: listingData.shop_section_id,
        is_personalizable: listingData.is_personalizable,
        personalization_is_required: listingData.personalization_is_required,
        personalization_instructions: listingData.personalization_instructions,
        personalization_char_count_max: listingData.personalization_char_count_max || 256,
        who_made: listingData.who_made || 'i_did',
        when_made: listingData.when_made || 'made_to_order'
      };
      
      console.log('📝 Etsy\'ye gönderilecek listing verisi hazırlandı');
      
      // Draft listing oluştur
      console.log('🔄 Draft listing oluşturuluyor...');
      const { listing_id } = await createDraftListing(accessToken, shopId, listingDataForEtsy);
      console.log(`✅ Draft listing oluşturuldu: ${listing_id}`);
      
      // Resim ve video dosyalarını yükle
      if (imageFiles.length > 0 || videoFiles.length > 0) {
        console.log(`🖼️ ${imageFiles.length} resim ve ${videoFiles.length} video yükleniyor...`);
        const uploadResult = await uploadFilesToEtsy(
          accessToken,
          shopId,
          listing_id,
          imageFiles as unknown as File[],
          videoFiles.length > 0 ? videoFiles[0] as unknown as File : null
        );
        console.log(`✅ Dosya yükleme tamamlandı: ${JSON.stringify(uploadResult)}`);
      }
      
      // Varyasyonlar varsa ekle
      if (listingData.has_variations && listingData.variations && listingData.variations.length > 0) {
        console.log('🔄 Varyasyonlar ekleniyor...');
        await addInventoryWithVariations(accessToken, listing_id, listingData.variations);
        console.log('✅ Varyasyonlar eklendi');
      }
      
      // İşlem süresi
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`⏱️ İşlem süresi: ${duration}ms`);
      
      return NextResponse.json({
        success: true,
        message: 'Listing başarıyla oluşturuldu',
        listing_id,
        duration
      });
    } catch (error: any) {
      console.error('❌ Etsy API hatası:', error);
      
      return NextResponse.json(
        { 
          error: error.message || 'Etsy API hatası',
          code: 'ETSY_API_ERROR',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('💥 GENEL HATA:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Bilinmeyen hata',
        code: 'UNKNOWN_ERROR',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}