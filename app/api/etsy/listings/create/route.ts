import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';
import { addInventoryWithVariations } from '@/lib/etsy-api';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Direkt Etsy listing oluşturma başlatılıyor...');
    
    // FormData'dan veriyi al
    const formData = await request.formData();
    const listingDataString = formData.get('listingData') as string;
    
    console.log('📋 Alınan listingData string:', listingDataString?.substring(0, 100) + '...');
    
    if (!listingDataString) {
      return NextResponse.json({ error: 'Listing data is required' }, { status: 400 });
    }
    
    let listingData;
    try {
      listingData = JSON.parse(listingDataString);
    } catch (parseError) {
      console.error('❌ JSON parse hatası:', parseError);
      console.error('❌ Problematik string:', listingDataString);
      return NextResponse.json({ error: 'Invalid listing data format' }, { status: 400 });
    }
    console.log('📋 Listing data alındı:', {
      title: listingData.title,
      state: listingData.state,
      hasImages: !!(listingData.images),
      hasVideo: !!(listingData.video || listingData.videoUrl),
      has_variations: listingData.has_variations,
      variation_count: listingData.variations?.length || 0
    });
    
    // Firebase Admin'i initialize et
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }
    
    // Kullanıcının Etsy credentials'ını al - Doğru koleksiyonları kullan
    const userId = 'local-user-123'; // Bu gerçek auth context'den gelecek
    
    // Aktif mağazayı bul
    const storesSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .where('is_active', '==', true)
      .get();
    
    if (storesSnapshot.empty) {
      return NextResponse.json({ 
        error: 'Etsy hesabınız bağlı değil', 
        code: 'NO_ETSY_TOKEN' 
      }, { status: 400 });
    }
    
    const storeDoc = storesSnapshot.docs[0];
    const storeData = storeDoc.data();
    const shop_id = storeDoc.id; // Shop ID document ID olarak saklanıyor
    
    // API anahtarlarını al
    const apiKeysDoc = await adminDb.collection('etsy_api_keys').doc(shop_id).get();
    
    if (!apiKeysDoc.exists) {
      return NextResponse.json({ 
        error: 'Etsy token bilgileri bulunamadı', 
        code: 'NO_API_KEYS' 
      }, { status: 400 });
    }
    
    const apiKeysData = apiKeysDoc.data()!;
    const { access_token, api_key } = apiKeysData;
    
    if (!access_token || !api_key) {
      return NextResponse.json({ 
        error: 'Etsy token geçersiz', 
        code: 'INVALID_ETSY_TOKEN' 
      }, { status: 400 });
    }
    
    console.log('🔑 Etsy credentials alındı, shop_id:', shop_id, 'shop_name:', storeData.shop_name);
    
    // Shipping profile ID'yi Firebase'den al
    let shippingProfileId = null;
    try {
      const shippingProfilesSnapshot = await adminDb
        .collection('shipping_profiles')
        .where('user_id', '==', userId)
        .limit(1)
        .get();
      
      if (!shippingProfilesSnapshot.empty) {
        const shippingProfile = shippingProfilesSnapshot.docs[0].data();
        shippingProfileId = shippingProfile.profile_id;
        console.log('✅ Shipping profile bulundu:', shippingProfileId);
      } else {
        console.log('⚠️ Firebase\'de shipping profile bulunamadı, Etsy API\'den alınacak');
        
        // Firebase'de yoksa, Etsy API'den mevcut shipping profile'ları al
        try {
          const shippingResponse = await fetch(`https://openapi.etsy.com/v3/application/shops/${shop_id}/shipping-profiles`, {
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'x-api-key': api_key,
            }
          });
          
          if (shippingResponse.ok) {
            const shippingData = await shippingResponse.json();
            if (shippingData.results && shippingData.results.length > 0) {
              shippingProfileId = shippingData.results[0].shipping_profile_id;
              console.log('✅ Etsy API\'den shipping profile alındı:', shippingProfileId);
            }
          }
        } catch (etsyApiError) {
          console.error('❌ Etsy API\'den shipping profile alınamadı:', etsyApiError);
        }
      }
    } catch (shippingError) {
      console.error('❌ Shipping profile alınırken hata:', shippingError);
    }
    
    // Hala bulunamadıysa hata fırlat
    if (!shippingProfileId) {
      return NextResponse.json({ 
        error: 'Geçerli bir shipping profile bulunamadı. Lütfen Etsy\'de en az bir kargo profili oluşturun.',
        code: 'NO_SHIPPING_PROFILE'
      }, { status: 400 });
    }
    
    // Görselleri FormData'dan al
    const imageFiles: File[] = [];
    let index = 0;
    while (true) {
      const imageFile = formData.get(`imageFile_${index}`) as File;
      if (!imageFile) break;
      imageFiles.push(imageFile);
      index++;
    }
    
    console.log('🖼️ Toplam resim sayısı:', imageFiles.length);
    
    // Video dosyasını FormData'dan al
    const videoFile = formData.get('videoFile') as File;
    console.log('🎥 Video dosyası:', videoFile ? `${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(2)} MB)` : 'Yok');
    
    // Etsy API'sine listing oluştur
    const etsyListingUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings`;
    
    const etsyFormData = new FormData();
    
    // Listing verisini ekle - ESKİ ÇALIŞAN VERSİYONA UYGUN DEFAULT DEĞERLER
    etsyFormData.append('quantity', (listingData.quantity || 4).toString()); // DEFAULT 4
    etsyFormData.append('title', listingData.title || 'Untitled Product');
    etsyFormData.append('description', listingData.description || 'No description provided');
    // Price kontrolü - Variation kullanıyorsak base price'ı en düşük variation'dan al
    let finalPrice = 0; // Default 0
    
    if (listingData.has_variations && listingData.variations?.length > 0) {
      // Variation kullanıyorsa en düşük variation price'ını base price yap
      const activePrices = listingData.variations
        .filter((v: any) => v.is_active && v.price > 0)
        .map((v: any) => v.price);
      
      if (activePrices.length > 0) {
        finalPrice = Math.min(...activePrices);
        console.log('✅ Varyasyonlu ürün - En düşük aktif fiyat kullanılıyor:', finalPrice);
      } else {
        // Aktif varyasyon yoksa, predefined variations'dan en düşük fiyatı al
        finalPrice = 80; // En düşük predefined price (Roll 8"x12")
        console.log('⚠️ Aktif varyasyon yok, predefined en düşük fiyat kullanılıyor:', finalPrice);
      }
      console.log('📊 Variation price sistemi:', {
        has_variations: true,
        active_variations: activePrices.length,
        final_price: finalPrice,
        all_active_prices: activePrices
      });
    } else {
      // Variation yoksa user input price'ını kullan, yoksa predefined en düşük
      finalPrice = listingData.price && listingData.price > 0 ? listingData.price : 80;
      console.log('📊 Tek fiyat sistemi:', {
        has_variations: false,
        user_price: listingData.price,
        final_price: finalPrice
      });
    }
    
    etsyFormData.append('price', finalPrice.toString());
    etsyFormData.append('who_made', listingData.who_made || 'i_did');
    etsyFormData.append('when_made', listingData.when_made || 'made_to_order');
    etsyFormData.append('taxonomy_id', (listingData.taxonomy_id || 1027).toString());
    etsyFormData.append('shipping_profile_id', shippingProfileId.toString());
    // return_policy_id sadece varsa ekle (Etsy integer bekliyor)
    if (listingData.return_policy_id && listingData.return_policy_id !== '') {
      etsyFormData.append('return_policy_id', listingData.return_policy_id.toString());
    }
    // Etsy Materials Temizleme Fonksiyonu - eski çalışan versiyona uygun
    function cleanEtsyMaterials(materials: string[]): string[] {
      return materials
        .filter(material => material && material.trim().length > 0)
        .map(material => material.trim())
        .slice(0, 13); // Etsy maksimum 13 material
    }
    
    // Materials'ı direkt listing oluştururken ekle - eski çalışan yöntem
    const materials = listingData.materials && listingData.materials.length > 0 
      ? cleanEtsyMaterials(listingData.materials) 
      : ['Cotton Canvas', 'Wood Frame', 'Hanger']; // Eski çalışan default materials
    
    // Materials'ı eski format ile ekle
    materials.forEach(material => {
      etsyFormData.append('materials[]', material);
    });
    // shop_section_id sadece varsa ekle (Etsy integer bekliyor)
    console.log('🏪 Shop section kontrolü:', {
      shop_section_id: listingData.shop_section_id,
      type: typeof listingData.shop_section_id,
      isEmpty: listingData.shop_section_id === '',
      isZero: listingData.shop_section_id === 0,
      isNull: listingData.shop_section_id === null,
      isUndefined: listingData.shop_section_id === undefined
    });
    
    // Shop Section ID'yi sadece geçerliyse ekle - eski çalışan versiyona uygun
    const sectionId = Number(listingData.shop_section_id);
    if (sectionId && sectionId > 0) {
      etsyFormData.append('shop_section_id', sectionId.toString());
      console.log(`✅ Ürün, dükkan bölümü ${sectionId}'e eklenecek.`);
    } else {
      console.log(`⚠️ Dükkan bölümü belirtilmedi, ürün ana sayfada yer alacak. (Değer: ${listingData.shop_section_id})`);
    }
    etsyFormData.append('processing_min', '1');
    etsyFormData.append('processing_max', '3');
    // Etsy Tags Temizleme Fonksiyonu - eski çalışan versiyona uygun  
    function cleanEtsyTags(tags: string[]): string[] {
      return tags
        .filter(tag => tag && tag.trim().length > 0)
        .map(tag => tag.trim())
        .slice(0, 13); // Maksimum 13 tag
    }
    
    // Tags'ları direkt listing oluştururken ekle - eski çalışan yöntem
    const cleanTags = listingData.tags && listingData.tags.length > 0 
      ? cleanEtsyTags(listingData.tags) 
      : ['art', 'canvas', 'print']; // Default tags - sadece alfanumerik
    
    // Tags'ları eski format ile ekle
    cleanTags.forEach(tag => {
      if (typeof tag === 'string' && tag.trim().length > 0) {
        etsyFormData.append('tags[]', tag.trim());
      }
    });
    
    console.log('🧹 Tags ve Materials hazırlandı (listing ile birlikte ekleniyor):', {
      original_price: listingData.price,
      final_price: finalPrice,
      original_tags_count: listingData.tags?.length,
      clean_tags_count: cleanTags.length,
      clean_tags: cleanTags,
      clean_materials: materials,
      original_materials_count: listingData.materials?.length,
      mode: 'TAGS_MATERIALS_WITH_LISTING'
    });
    console.log('🎨 Personalization ayarları:', {
      is_personalizable: listingData.is_personalizable,
      personalization_is_required: listingData.personalization_is_required,
      personalization_char_count_max: listingData.personalization_char_count_max,
      personalization_instructions: listingData.personalization_instructions
    });
    
    // Personalization ayarları - eski çalışan versiyona uygun
    if (typeof listingData.is_personalizable !== 'undefined') {
      etsyFormData.append('is_personalizable', listingData.is_personalizable ? 'true' : 'false');
    } else {
      etsyFormData.append('is_personalizable', 'true'); // Default true
    }
    
    if (typeof listingData.personalization_is_required !== 'undefined') {
      etsyFormData.append('personalization_is_required', listingData.personalization_is_required ? 'true' : 'false');
    } else {
      etsyFormData.append('personalization_is_required', 'false'); // Default false
    }
    
    if (typeof listingData.personalization_instructions === 'string' && listingData.personalization_instructions.length > 0) {
      etsyFormData.append('personalization_instructions', listingData.personalization_instructions);
    } else {
      etsyFormData.append('personalization_instructions', 'Phone Number for Delivery'); // Default
    }
    
    if (typeof listingData.personalization_char_count_max !== 'undefined') {
      etsyFormData.append('personalization_char_count_max', listingData.personalization_char_count_max.toString());
    } else {
      etsyFormData.append('personalization_char_count_max', '255'); // Default
    }
    etsyFormData.append('is_supply', (listingData.is_supply || false).toString());
    etsyFormData.append('is_customizable', 'true');
    etsyFormData.append('should_auto_renew', listingData.renewal_option === 'automatic' ? 'true' : 'false');
    etsyFormData.append('state', 'draft'); // Her zaman draft olarak başla, sonra resim ekleyip activate ederiz
    
    // NOT: Varyasyonlar draft listing oluşturduktan sonra ayrı API call'la eklenecek
    
    // NOT: Resimler ayrı endpoint'e upload edilecek - burada eklenmez
    
    // NOT: Video da ayrı endpoint'e upload edilecek - burada eklenmez
    
    console.log('📤 ADIM 1: Draft listing oluşturuluyor...');
    console.log('⏰ Başlangıç zamanı:', new Date().toISOString());
    console.log('📋 Listing state:', 'draft'); // Her zaman draft olarak başla
    console.log('📋 Sonra upload edilecek resim sayısı:', imageFiles.length);
    console.log('📋 Sonra upload edilecek video:', videoFile ? 'Var' : 'Yok');
    console.log('📋 API URL:', etsyListingUrl);
    console.log('📋 Form data keys:', Array.from(etsyFormData.keys()));
    
    // Debug: Gönderilen tüm verileri log'la
    console.log('🔍 Gönderilen veriler detayı:');
    for (const [key, value] of etsyFormData.entries()) {
      if (key === 'image') {
        console.log(`  ${key}: [File: ${value.name}, ${(value.size / 1024).toFixed(1)}KB]`);
      } else if (key === 'tags' || key === 'materials') {
        // Test mode: tags ve materials atlandı
        console.log(`  ${key}: ATLANMIŞ (test mode)`);
      } else {
        console.log(`  ${key}: ${typeof value === 'string' ? value.slice(0, 100) : value}`);
      }
    }
    
    const startTime = Date.now();
    
    // Timeout controller ekle
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error('⏰ Etsy API timeout - 30 seconds');
    }, 60000); // 60 saniye timeout
    
    try {
      // Etsy API çağrısı
      const etsyResponse = await fetch(etsyListingUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'x-api-key': api_key,
        },
        body: etsyFormData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      // Rate limit bilgilerini al
      const rateLimitRemaining = etsyResponse.headers.get('x-ratelimit-remaining');
      const rateLimitLimit = etsyResponse.headers.get('x-ratelimit-limit');
      const rateLimitReset = etsyResponse.headers.get('x-ratelimit-reset');
      
      console.log('📥 Etsy API yanıtı:', etsyResponse.status, etsyResponse.ok, `(${duration}s)`);
      console.log('⚡ Rate Limit:', `${rateLimitRemaining}/${rateLimitLimit} kalan`, rateLimitReset ? `Reset: ${new Date(parseInt(rateLimitReset) * 1000).toLocaleString('tr-TR')}` : '');
    
      const etsyResult = await etsyResponse.json();
      console.log('📋 Response data keys:', Object.keys(etsyResult));
      
      if (!etsyResponse.ok) {
        console.error('❌ Etsy API hatası:', {
          status: etsyResponse.status,
          statusText: etsyResponse.statusText,
          response_body: etsyResult,
          sent_data_keys: Array.from(etsyFormData.keys())
        });
        
        // Detaylı hata mesajı
        let errorMessage = 'Unknown error';
        if (Array.isArray(etsyResult)) {
          // Error array format (validation errors)
          errorMessage = etsyResult.map(err => `${err.path}: ${err.message}`).join(', ');
        } else if (etsyResult.error) {
          errorMessage = etsyResult.error;
        } else if (etsyResult.message) {
          errorMessage = etsyResult.message;
        }
        
        return NextResponse.json({
          error: `Etsy API Error: ${errorMessage}`,
          details: etsyResult,
          code: 'ETSY_API_ERROR',
          status: etsyResponse.status
        }, { status: etsyResponse.status });
      }
    
    console.log('✅ ADIM 1 tamamlandı - Draft listing oluşturuldu:', etsyResult.listing_id);
    console.log('📋 Etsy listing URL:', etsyResult.url);
    
    // ADIM 2: Resimleri upload et
    let uploadedImageCount = 0;
    if (imageFiles.length > 0) {
      console.log(`📤 ADIM 2: ${imageFiles.length} resim upload ediliyor...`);
      
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        console.log(`📷 Resim ${i + 1}/${imageFiles.length} upload ediliyor:`, imageFile.name, (imageFile.size / 1024 / 1024).toFixed(2), 'MB');
        
        try {
          const imageFormData = new FormData();
          imageFormData.append('image', imageFile);
          imageFormData.append('rank', (i + 1).toString()); // Resim sıralaması için rank ekle
          imageFormData.append('alt_text', `Image ${i + 1} of ${listingData.title}`); // SEO için alt text
          
          console.log(`🔢 Resim ${i + 1} rank'ı:`, i + 1);
          
          const imageUploadUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings/${etsyResult.listing_id}/images`;
          
          const imageResponse = await fetch(imageUploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'x-api-key': api_key,
            },
            body: imageFormData,
          });
          
          if (imageResponse.ok) {
            const imageResult = await imageResponse.json();
            uploadedImageCount++;
            console.log(`✅ Resim ${i + 1} başarıyla upload edildi:`, imageResult.listing_image_id);
          } else {
            const errorText = await imageResponse.text();
            console.error(`❌ Resim ${i + 1} upload hatası:`, imageResponse.status, errorText);
          }
        } catch (imageError) {
          console.error(`❌ Resim ${i + 1} upload exception:`, imageError);
        }
      }
      
      console.log(`📊 Resim upload özeti: ${uploadedImageCount}/${imageFiles.length} başarılı`);
    }
    
    // ADIM 2.5: Video upload et (eğer varsa)
    let videoUploaded = false;
    if (videoFile) {
      console.log('📤 ADIM 2.5: Video upload ediliyor...');
      console.log(`🎥 Video upload ediliyor:`, videoFile.name, (videoFile.size / 1024 / 1024).toFixed(2), 'MB');
      
      try {
        const videoFormData = new FormData();
        videoFormData.append('video', videoFile);
        const videoName = videoFile.name.replace(/\.[^/.]+$/, ""); // Dosya adını uzantısız
        videoFormData.append('name', videoName);
        console.log('🔍 Video FormData:', { 
          name: videoName, 
          fileSize: videoFile.size, 
          fileType: videoFile.type 
        });
        
        const videoUploadUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings/${etsyResult.listing_id}/videos`;
        
        const videoResponse = await fetch(videoUploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-api-key': api_key,
          },
          body: videoFormData,
        });
        
        if (videoResponse.ok) {
          const videoResult = await videoResponse.json();
          videoUploaded = true;
          console.log(`✅ Video başarıyla upload edildi:`, videoResult.video_id);
        } else {
          const errorText = await videoResponse.text();
          console.error(`❌ Video upload hatası:`, videoResponse.status, errorText);
        }
      } catch (videoError) {
        console.error(`❌ Video upload exception:`, videoError);
      }
    }
    
    // ADIM 2.8: Varyasyonları ekle (yeni sistem)
    if (listingData.has_variations && listingData.variations?.length > 0) {
      console.log('📤 ADIM 2.8: Varyasyonlar ekleniyor...');
      console.log(`🎯 Toplam varyasyon sayısı:`, listingData.variations.length);
      
      try {
        await addInventoryWithVariations(access_token, etsyResult.listing_id, listingData.variations);
        console.log('✅ Varyasyonlar başarıyla eklendi - 48 kombinasyon oluşturuldu');
      } catch (variationError) {
        console.error('❌ Varyasyon ekleme hatası:', variationError);
        // Varyasyon hatası olsa bile listing'i devam ettir
      }
    }
    
    // ADIM 2.9: Tags ve Materials artık listing oluştururken eklendi - PATCH'e gerek yok
    console.log('✅ Tags ve materials listing ile birlikte eklendi:', {
      tags_count: cleanTags.length,
      materials_count: materials.length,
      tags: cleanTags,
      materials: materials
    });
    
    // ADIM 3: Eğer kullanıcı active olarak kaydetmek istiyorsa activate et
    if (listingData.state === 'active' && uploadedImageCount > 0) {
      console.log('📤 ADIM 3: Listing aktif hale getiriliyor...');
      
      try {
        const activateFormData = new FormData();
        activateFormData.append('state', 'active');
        
        const activateResponse = await fetch(`https://openapi.etsy.com/v3/application/shops/${shop_id}/listings/${etsyResult.listing_id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-api-key': api_key,
          },
          body: activateFormData,
        });
        
        if (activateResponse.ok) {
          console.log('✅ Listing başarıyla aktif hale getirildi');
        } else {
          const errorText = await activateResponse.text();
          console.error('❌ Listing aktifleştirme hatası:', activateResponse.status, errorText);
        }
      } catch (activateError) {
        console.error('❌ Listing aktifleştirme exception:', activateError);
      }
    }
    
    // Firebase'e başarılı listing'i kaydet
    await adminDb.collection('etsy_listings').doc(etsyResult.listing_id.toString()).set({
      user_id: userId,
      shop_id: shop_id,
      listing_id: etsyResult.listing_id,
      title: listingData.title || 'Untitled Product',
      state: listingData.state || 'draft',
      created_at: new Date(),
      etsy_data: etsyResult
    });
    
    // Final logging
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    const productTitle = listingData.title || 'Untitled Product';
    const finalState = listingData.state === 'active' && uploadedImageCount > 0 ? 'active' : 'draft';
    
    console.log('');
    console.log('🎉 =========================== BAŞARILI ÜRÜN EKLEME ===========================');
    console.log('📦 Ürün Adı:', productTitle);
    console.log('⏱️  Toplam Yükleme Süresi:', `${totalDuration} saniye`);
    console.log('📷 Yüklenen Resim:', `${uploadedImageCount}/${imageFiles.length}`);
    console.log('🎬 Video:', videoUploaded ? 'Yüklendi' : 'Yok');
    console.log('📊 Durum:', finalState === 'active' ? 'Aktif' : 'Taslak');
    console.log('🔗 Listing ID:', etsyResult.listing_id);
    console.log('⚡ Rate Limit Durumu:', `${rateLimitRemaining}/${rateLimitLimit} kalan`);
    console.log('🕒 Rate Limit Reset:', rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toLocaleString('tr-TR') : 'Bilinmiyor');
    console.log('===============================================================================');
    console.log('');
    
    return NextResponse.json({
      success: true,
      listing_id: etsyResult.listing_id,
      listing: etsyResult,
      uploaded_images: uploadedImageCount,
      uploaded_video: videoUploaded,
      final_state: finalState,
      total_duration: totalDuration,
      rate_limit: {
        remaining: rateLimitRemaining,
        limit: rateLimitLimit,
        reset: rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toISOString() : null
      },
      message: `Listing oluşturuldu! ${uploadedImageCount}/${imageFiles.length} resim${videoUploaded ? ', 1 video' : ''} yüklendi, durum: ${finalState === 'active' ? 'aktif' : 'taslak'}`
    });
    
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('⏰ Etsy API timeout');
        return NextResponse.json({
          error: 'Etsy API zaman aşımı - 30 saniye içinde yanıt alamadık',
          code: 'TIMEOUT_ERROR',
          success: false
        }, { status: 408 });
      }
      
      console.error('❌ Etsy API fetch hatası:', fetchError);
      return NextResponse.json({
        error: `Etsy API bağlantı hatası: ${fetchError.message}`,
        code: 'CONNECTION_ERROR',
        success: false
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Direkt Etsy listing hatası:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Listing oluşturulamadı',
      success: false
    }, { status: 500 });
  }
}