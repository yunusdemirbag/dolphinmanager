// /app/api/etsy/listings/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from "@/lib/supabase/server";
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
    // Request tipini belirle - Content-Type header'ından anlayabiliriz
    const contentType = request.headers.get('content-type') || '';
    const isJsonRequest = contentType.includes('application/json');
    
    // Internal API key kontrolü
    const internalApiKey = request.headers.get('X-Internal-API-Key');
    const expectedApiKey = process.env.INTERNAL_API_KEY || 'queue-processor-key';
    const isInternalRequest = internalApiKey === expectedApiKey;
    
    // JSON request ise muhtemelen internal request'tir
    const shouldTreatAsInternal = isInternalRequest || isJsonRequest;
    
    console.log('🔍 Request Type Debug:', { 
      contentType,
      isJsonRequest,
      headerValue: internalApiKey, 
      envValue: expectedApiKey, 
      isInternalRequest,
      shouldTreatAsInternal
    });
    
    let supabase;
    let userId: string;
    let listingData: any;
    let imageFiles: any[] = [];
    let videoFiles: any[] = [];
    
    if (shouldTreatAsInternal) {
      // Internal request - JSON body bekle
      console.log('🔧 Internal request algılandı, JSON body okunuyor');
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // JSON body'yi oku
      const requestBody = await request.json();
      console.log('🔍 JSON Request Body Keys:', Object.keys(requestBody));
      console.log('🔍 JSON Request Body Structure:', {
        hasUserId: !!requestBody.userId,
        hasUser_id: !!requestBody.user_id,
        hasListingData: !!requestBody.listingData,
        listingDataKeys: requestBody.listingData ? Object.keys(requestBody.listingData) : 'N/A'
      });
      
      listingData = requestBody.listingData || requestBody;  // Queue processor listingData içinde gönderiyor
      userId = requestBody.userId || requestBody.user_id || requestBody.listingData?.user_id;  // Farklı field'ları dene
      
              // JSON requestte resim dosyalari imageFiles arrayinde base64 olarak geliyor
      if (listingData.imageFiles && Array.isArray(listingData.imageFiles)) {
        console.log(`📸 JSON requestte ${listingData.imageFiles.length} resim bulundu`);
        imageFiles = listingData.imageFiles.map((imgData: any, index: number) => {
                      // Base64ten Buffera cevir
          const base64Data = imgData.base64.replace(/^data:image\/[a-z]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Node.js File object oluştur (experimental buffer.File)
          const fileName = imgData.filename || `image-${index + 1}.jpg`;
          const fileType = imgData.type || 'image/jpeg';
          
          // Node.js ortamında File constructor yok, Blob kullan
          const blob = new Blob([buffer], { type: fileType });
          // Blob'u File-like object'e dönüştür
          Object.defineProperty(blob, 'name', { value: fileName, writable: false, enumerable: true });
          Object.defineProperty(blob, 'lastModified', { value: Date.now(), writable: false, enumerable: true });
          
          // Debug: Oluşturulan blob'un özelliklerini logla
          console.log(`[CREATE_ROUTE] Video blob created:`, {
            name: (blob as any).name,
            size: blob.size,
            type: blob.type,
            hasName: 'name' in blob,
            hasLastModified: 'lastModified' in blob
          });
          
          return blob as any;
        });
        console.log(`✅ ${imageFiles.length} resim JSONdan islendi`);
      } else {
        imageFiles = [];
        console.log('❌ JSON requestte resim bulunamadi');
      }
      
      console.log('🔍 Extracted userId:', userId);
      console.log('🔍 Extracted listingData title:', listingData?.title);
      
      // Queue processor'dan gelen image files'ları işle
      if (requestBody.imageFiles && requestBody.imageFiles.length > 0) {
        console.log(`📸 Queue processor'dan ${requestBody.imageFiles.length} resim alındı`);
        imageFiles = requestBody.imageFiles.map((img: any, index: number) => {
          // Base64 string'den Buffer oluştur
          const base64Data = img.data.replace(/^data:image\/[a-z]+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = img.name || `image-${index + 1}.jpg`;
          
          // Node.js ortamında File constructor yok, Blob kullan
          const blob = new Blob([buffer], { type: img.type });
          Object.defineProperty(blob, 'name', { value: fileName, writable: false, enumerable: true });
          Object.defineProperty(blob, 'lastModified', { value: Date.now(), writable: false, enumerable: true });
          
          // Debug: Oluşturulan blob'un özelliklerini logla
          console.log(`[CREATE_ROUTE] Queue image blob created:`, {
            originalName: img.name,
            finalName: fileName,
            size: blob.size,
            type: blob.type,
            bufferSize: buffer.length,
            base64Length: img.data.length,
            hasName: 'name' in blob,
            hasLastModified: 'lastModified' in blob
          });
          
          return blob as any;
        });
        console.log(`✅ ${imageFiles.length} resim queue processor'dan işlendi`);
      }
      
      console.log('📝 Internal request data:', {
        userId,
        title: listingData?.title,
        imageCount: imageFiles.length
      });
      
    } else {
      // Normal request - FormData bekle
      console.log('👤 Normal user request algılandı, FormData okunuyor');
      supabase = await createClient();
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
      
      userId = session.user.id;
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
      
      listingData = JSON.parse(listingDataStr);
      
      // Dosyaları kontrol et
      imageFiles = formData.getAll('imageFiles');
      videoFiles = formData.getAll('videoFiles');
    }
    
    console.log('📝 Listing data alındı:', {
      title: listingData.title,
      price: listingData.price,
      tags: listingData.tags?.length,
      hasVariations: listingData.has_variations
    });
    
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
      const { listing_id } = await createDraftListing(accessToken, parseInt(shopId), listingDataForEtsy);
      console.log(`✅ Draft listing oluşturuldu: ${listing_id}`);
      
      // Resim ve video dosyalarını yükle
      if (imageFiles.length > 0 || videoFiles.length > 0) {
        console.log(`🖼️ ${imageFiles.length} resim ve ${videoFiles.length} video yükleniyor...`);
        const uploadResult = await uploadFilesToEtsy(
          accessToken,
          parseInt(shopId),
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
      const durationInSeconds = (duration / 1000).toFixed(2);
      
      // Ürün başlığını log'a yazdır
      console.log('\n📌 ÜRÜN BAŞLIĞI:');
      console.log(`   ${listingData.title}`);
      console.log(`\n⏱️ TOPLAM İŞLEM SÜRESİ: ${durationInSeconds} saniye (${duration}ms)`);
      
      // Supabase'e yükleme bilgilerini kaydet
      try {
        // Önce şema önbelleğini yenilemeyi dene
        try {
          // Şema önbelleği yenileme işlemi
          console.log('✅ Şema önbelleği yenileme sinyali gönderildi');
        } catch (schemaError) {
          console.warn('⚠️ Şema önbelleği yenilenemedi:', schemaError);
        }
        
        // Yükleme verilerini hazırla
        const uploadData = {
          user_id: userId,
          listing_id: parseInt(listing_id),
          shop_id: parseInt(shopId),
          title: listingData.title,
          state: listingData.state || 'draft',
          upload_duration: duration,
          image_count: imageFiles.length,
          video_count: videoFiles.length,
          has_variations: Boolean(listingData.has_variations),
          variation_count: listingData.variations?.length || 0,
          title_tokens: listingData.tokenUsage?.title_total_tokens || 0,
          tags_tokens: listingData.tokenUsage?.tags_total_tokens || 0,
          tags: listingData.tags || [],
          total_tokens: (
            (listingData.tokenUsage?.title_total_tokens || 0) +
            (listingData.tokenUsage?.tags_total_tokens || 0) +
            (listingData.tokenUsage?.description_total_tokens || 0)
          )
        };
        
        console.log('📊 Yükleme verileri hazırlandı:', JSON.stringify(uploadData));
        
        // SQL sorgusu ile doğrudan kaydet
        const insertQuery = `
          INSERT INTO etsy_uploads (
            user_id, shop_id, title, state, upload_duration,
            image_count, video_count, has_variations, variation_count,
            title_tokens, tags_tokens, tags, total_tokens
          ) VALUES (
            '${userId}', ${parseInt(shopId)}, 
            '${listingData.title.replace(/'/g, "''")}', '${listingData.state || 'draft'}', ${duration},
            ${imageFiles.length}, ${videoFiles.length}, 
            ${listingData.has_variations ? 'true' : 'false'}, ${listingData.variations?.length || 0},
            ${listingData.tokenUsage?.title_total_tokens || 0}, 
            ${listingData.tokenUsage?.tags_total_tokens || 0},
            array[${listingData.tags ? listingData.tags.map((tag: string) => `'${tag.replace(/'/g, "''")}'`).join(',') : ''}],
            ${(listingData.tokenUsage?.title_total_tokens || 0) +
              (listingData.tokenUsage?.tags_total_tokens || 0) +
              (listingData.tokenUsage?.description_total_tokens || 0)}
          ) RETURNING id;
        `;
        
        try {
          // SQL query için genel bir RPC çağrısı yap
          const { data: sqlResult, error: sqlError } = await supabase.rpc('execute_sql', { sql_query: insertQuery });
          
          if (sqlError) {
            console.warn('⚠️ SQL ile yükleme bilgileri kaydedilemedi:', sqlError);
            
            // Standart yöntemle tekrar dene
            const { error: uploadError } = await supabase
              .from('etsy_uploads')
              .insert(uploadData);
              
            if (uploadError) {
              console.warn('⚠️ Yükleme bilgileri veritabanına kaydedilemedi:', uploadError);
            } else {
              console.log('✅ Yükleme bilgileri veritabanına kaydedildi');
            }
          } else {
            console.log('✅ SQL ile yükleme bilgileri veritabanına kaydedildi:', sqlResult);
          }
        } catch (sqlExecError) {
          console.warn('⚠️ SQL çalıştırma hatası:', sqlExecError);
          
          // Standart yöntemle tekrar dene
          const { error: uploadError } = await supabase
            .from('etsy_uploads')
            .insert(uploadData);
            
          if (uploadError) {
            console.warn('⚠️ Yükleme bilgileri veritabanına kaydedilemedi:', uploadError);
          } else {
            console.log('✅ Yükleme bilgileri veritabanına kaydedildi');
          }
        }
      } catch (dbError) {
        console.warn('⚠️ Veritabanı kaydı sırasında hata:', dbError);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Listing başarıyla oluşturuldu',
        listing_id,
        duration,
        durationInSeconds
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