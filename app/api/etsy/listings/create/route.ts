import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';
import { addInventoryWithVariations } from '@/lib/etsy-api';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Direkt Etsy listing oluşturma başlatılıyor...');
    
    // Content-Type kontrol et
    const contentType = request.headers.get('content-type') || '';
    let listingData: any;
    let formData: FormData | null = null;
    
    if (contentType.includes('application/json')) {
      // JSON formatında veri geldi (ProductFormModal'dan)
      console.log('📋 JSON formatında veri alındı');
      listingData = await request.json();
    } else {
      // FormData formatında veri geldi (process route'dan)
      console.log('📋 FormData formatında veri alındı');
      formData = await request.formData();
      const listingDataString = formData.get('listingData') as string;
      
      console.log('📋 Alınan listingData string:', listingDataString?.substring(0, 100) + '...');
      
      if (!listingDataString) {
        return NextResponse.json({ error: 'Listing data is required' }, { status: 400 });
      }
      
      try {
        listingData = JSON.parse(listingDataString);
        
        // IMPORTANT: Digital ürünler için AI'dan gelen shop_section_id'yi kullan
        if (listingData.type === 'download') {
          // FormData'da shopSection varsa (AI'dan gelen), onu kullan
          const aiShopSection = formData.get('shopSection');
          if (aiShopSection && aiShopSection !== 'undefined' && aiShopSection !== '') {
            listingData.shop_section_id = parseInt(aiShopSection.toString());
            console.log(`🔄 Digital ürün için AI shopSection kullanılıyor: ${listingData.shop_section_id}`);
          }
        }
      } catch (parseError) {
        console.error('❌ JSON parse hatası:', parseError);
        console.error('❌ Problematik string:', listingDataString);
        return NextResponse.json({ error: 'Invalid listing data format' }, { status: 400 });
      }
    }
    
    // Digital dosyaları FormData'dan çıkar
    const digitalFiles: File[] = [];
    let digitalFileIndex = 0;
    console.log('🔍 FormData içeriği kontrol ediliyor...');
    
    // FormData'daki tüm key'leri debug için göster
    const formDataKeys = Array.from(formData.keys());
    console.log('📋 FormData keys:', formDataKeys);
    
    while (formData.has(`digitalFile_${digitalFileIndex}`)) {
      const digitalFile = formData.get(`digitalFile_${digitalFileIndex}`) as File;
      console.log(`🔍 digitalFile_${digitalFileIndex} bulundu:`, digitalFile?.name, digitalFile?.size);
      if (digitalFile && digitalFile.size > 0) {
        digitalFiles.push(digitalFile);
      }
      digitalFileIndex++;
    }
    
    console.log(`📊 Digital dosya çıkarma özeti: ${digitalFiles.length} dosya bulundu`);

    console.log('📋 Listing data alındı:', {
      title: listingData.title,
      state: listingData.state,
      type: listingData.type,
      hasImages: !!formData.get('imageFile_0'),
      hasVideo: !!formData.get('videoFile'),
      hasDigitalFiles: digitalFiles.length > 0,
      digitalFileCount: digitalFiles.length,
      digitalFileNames: digitalFiles.map(f => f.name),
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
    let { access_token, api_key, refresh_token, expires_at } = apiKeysData;
    
    // Token süresinin dolup dolmadığını kontrol et
    const tokenExpired = expires_at ? new Date(expires_at.toDate()) < new Date() : true;
    
    if (tokenExpired) {
      console.log('⚠️ Etsy token süresi dolmuş, yenileniyor...');
      
      // Token'ı yenile
      try {
        const { refreshEtsyToken } = await import('@/lib/etsy-api');
        const newToken = await refreshEtsyToken(shop_id);
        
        if (newToken) {
          console.log('✅ Etsy token başarıyla yenilendi');
          access_token = newToken;
        } else {
          console.error('❌ Etsy token yenilenemedi');
          return NextResponse.json({
            error: 'Etsy bağlantısı kesildi. Lütfen Etsy hesabınızı yeniden bağlayın.',
            code: 'REFRESH_TOKEN_FAILED'
          }, { status: 401 });
        }
      } catch (refreshError) {
        console.error('❌ Token yenileme hatası:', refreshError);
        return NextResponse.json({
          error: 'Etsy bağlantısı kesildi. Lütfen Etsy hesabınızı yeniden bağlayın.',
          code: 'REFRESH_TOKEN_ERROR'
        }, { status: 401 });
      }
    }
    
    if (!access_token || !api_key) {
      return NextResponse.json({
        error: 'Etsy token geçersiz',
        code: 'INVALID_ETSY_TOKEN'
      }, { status: 400 });
    }
    
    console.log('🔑 Etsy credentials alındı, shop_id:', shop_id, 'shop_name:', storeData.shop_name);
    
    // ENHANCED SHIPPING PROFILE CACHE SYSTEM
    let shippingProfileId = null;
    const SHIPPING_CACHE_KEY = `shipping_profile_${shop_id}`;
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 saat cache
    
    console.log('🚛 ENHANCED shipping profile cache sistemi başlatılıyor...');
    
    try {
      // Step 1: Shop-specific cache'den al (en hızlı)
      const cachedShippingDoc = await adminDb
        .collection('shipping_cache')
        .doc(SHIPPING_CACHE_KEY)
        .get();
      
      if (cachedShippingDoc.exists) {
        const cachedData = cachedShippingDoc.data()!;
        const cacheAge = Date.now() - cachedData.timestamp;
        
        if (cacheAge < CACHE_DURATION) {
          shippingProfileId = cachedData.profile_id;
          console.log(`✅ Shipping profile cache'den alındı:`, {
            profile_id: shippingProfileId,
            cache_age_hours: (cacheAge / (1000 * 60 * 60)).toFixed(1),
            shop_id: shop_id
          });
        } else {
          console.log(`⚠️ Shipping profile cache eski (${(cacheAge / (1000 * 60 * 60)).toFixed(1)} saat), yenileniyor...`);
        }
      }
      
      // Step 2: Cache yoksa veya eskiyse Firebase'den al
      if (!shippingProfileId) {
        console.log('🔍 Firebase shipping_profiles koleksiyonundan aranıyor...');
        
        // Composite index gerekmeyecek şekilde basit query kullan
        try {
          const shippingProfilesSnapshot = await adminDb
            .collection('shipping_profiles')
            .where('user_id', '==', userId)
            .where('shop_id', '==', shop_id)
            .limit(5) // orderBy kaldırdık, index gerektirmiyor
            .get();
          
          console.log(`📋 Firebase'den ${shippingProfilesSnapshot.size} shipping profile bulundu`);
        
          if (!shippingProfilesSnapshot.empty) {
            // En yeni olanı manual olarak seç (created_at'e göre)
            let newestProfile = null;
            let newestDate = 0;
            
            shippingProfilesSnapshot.docs.forEach(doc => {
              const data = doc.data();
              const createdAt = data.created_at?.toMillis?.() || data.created_at?.getTime?.() || 0;
              if (createdAt > newestDate) {
                newestDate = createdAt;
                newestProfile = data;
              }
            });
            
            if (newestProfile) {
              shippingProfileId = newestProfile.profile_id;
              console.log('✅ Firebase\'de shipping profile bulundu:', {
                profile_id: shippingProfileId,
                title: newestProfile.title,
                age_hours: ((Date.now() - newestDate) / (1000 * 60 * 60)).toFixed(1)
              });
            }
          }
        } catch (indexError) {
          console.log('⚠️ Firebase composite query hatası, basit query deneniyor:', indexError.message);
          
          // Fallback: Sadece user_id ile ara
          try {
            const simpleSnapshot = await adminDb
              .collection('shipping_profiles')
              .where('user_id', '==', userId)
              .limit(10)
              .get();
            
            console.log(`📋 Basit query ile ${simpleSnapshot.size} shipping profile bulundu`);
            
            if (!simpleSnapshot.empty) {
              // Shop_id'ye göre filtrele (client-side)
              const matchingProfiles = simpleSnapshot.docs
                .map(doc => doc.data())
                .filter(data => data.shop_id === shop_id);
              
              if (matchingProfiles.length > 0) {
                shippingProfileId = matchingProfiles[0].profile_id;
                console.log('✅ Client-side filter ile shipping profile bulundu:', shippingProfileId);
              }
            }
          } catch (simpleError) {
            console.error('❌ Basit Firebase query de hatası:', simpleError.message);
          }
        }
        
        if (shippingProfileId) {
          // Cache'e kaydet
          await adminDb.collection('shipping_cache').doc(SHIPPING_CACHE_KEY).set({
            profile_id: shippingProfileId,
            shop_id: shop_id,
            user_id: userId,
            timestamp: Date.now(),
            source: 'firebase'
          });
          console.log('💾 Shipping profile cache\'e kaydedildi');
        }
      }
      
      // Step 3: Firebase'de de yoksa Etsy API'den al ve cache'le
      if (!shippingProfileId) {
        console.log('🌐 Etsy API\'den shipping profiles çekiliyor...');
        
        const shippingResponse = await fetch(`https://openapi.etsy.com/v3/application/shops/${shop_id}/shipping-profiles`, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-api-key': api_key,
          }
        });
        
        if (shippingResponse.ok) {
          const shippingData = await shippingResponse.json();
          console.log(`📦 Etsy API'den ${shippingData.results?.length || 0} shipping profile alındı`);
          
          if (shippingData.results && shippingData.results.length > 0) {
            // En uygun profile'ı seç (aktif ve default olanları öncelikle)
            const bestProfile = shippingData.results.find((p: any) => p.is_default) || shippingData.results[0];
            shippingProfileId = bestProfile.shipping_profile_id;
            
            console.log('✅ Etsy API\'den shipping profile alındı:', {
              profile_id: shippingProfileId,
              title: bestProfile.title,
              is_default: bestProfile.is_default,
              total_profiles: shippingData.results.length
            });
            
            // Hem cache'e hem de Firebase'e kalıcı olarak kaydet
            const cleanProfile: Record<string, any> = {
              profile_id: shippingProfileId,
              shop_id: shop_id,
              user_id: userId,
              title: bestProfile.title || 'Unknown',
              created_at: new Date(),
              source: 'etsy_api'
            };
            
            // is_default sadece undefined değilse ekle
            if (bestProfile.is_default !== undefined) {
              cleanProfile.is_default = bestProfile.is_default;
            }
            
            const profileData = cleanProfile;
            
            // Cache'e kaydet (hızlı erişim için)
            await adminDb.collection('shipping_cache').doc(SHIPPING_CACHE_KEY).set({
              ...profileData,
              timestamp: Date.now()
            });
            
            // Firebase'e kalıcı kaydet
            await adminDb.collection('shipping_profiles').add(profileData);
            
            console.log('💾 Shipping profile hem cache\'e hem Firebase\'e kaydedildi');
          } else {
            console.log('❌ Etsy API\'den hiç shipping profile dönmedi');
          }
        } else {
          const errorText = await shippingResponse.text();
          console.error('❌ Etsy shipping profiles API hatası:', {
            status: shippingResponse.status,
            error: errorText
          });
        }
      }
      
    } catch (shippingError) {
      console.error('❌ Enhanced shipping profile sistemi hatası:', shippingError);
    }
    
    // Final check: Hala bulunamadıysa detaylı hata mesajı
    if (!shippingProfileId) {
      console.error('❌ SHIPPING PROFILE BULUNAMADI - Tüm yöntemler denendi:', {
        shop_id: shop_id,
        user_id: userId,
        cache_key: SHIPPING_CACHE_KEY,
        tried_methods: ['cache', 'firebase', 'etsy_api']
      });
      
      return NextResponse.json({ 
        error: 'Geçerli bir shipping profile bulunamadı. Tüm yöntemler denendi (cache, Firebase, Etsy API). Lütfen Etsy\'de en az bir kargo profili oluşturun ve ProductFormModal\'ı bir kez açıp kapatın.',
        code: 'NO_SHIPPING_PROFILE',
        shop_id: shop_id,
        debug_info: {
          cache_key: SHIPPING_CACHE_KEY,
          methods_tried: ['cache', 'firebase', 'etsy_api']
        }
      }, { status: 400 });
    }
    
    console.log('🎯 FINAL shipping profile:', {
      profile_id: shippingProfileId,
      shop_id: shop_id,
      cache_key: SHIPPING_CACHE_KEY
    });
    
    // Görselleri al - FormData veya JSON'dan
    const imageFiles: File[] = [];
    let videoFile: File | null = null;
    
    if (formData) {
      // FormData'dan görselleri al (process route'dan geldiğinde)
      let index = 0;
      while (true) {
        const imageFile = formData.get(`imageFile_${index}`) as File;
        if (!imageFile) break;
        imageFiles.push(imageFile);
        index++;
      }
      
      // Video dosyasını FormData'dan al
      videoFile = formData.get('videoFile') as File;
    } else {
      // JSON formatından geldiğinde - ProductFormModal'dan gelen resimler
      if (listingData.images && Array.isArray(listingData.images)) {
        console.log('📸 JSON\'dan resim verileri alınıyor:', listingData.images.length);
        // JSON formatında base64 resimler var - bunları File objelerine çevirmek gerekir
        // Ancak şimdilik boş bırakıyoruz çünkü ProductFormModal'da zaten dosyalar FormData olarak gönderilmeli
        console.log('⚠️ JSON formatında resim verisi desteklenmiyor, FormData kullanın');
      }
    }
    
    console.log('🖼️ Toplam resim sayısı:', imageFiles.length);
    console.log('🎥 Video dosyası:', videoFile ? `${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(2)} MB)` : 'Yok');
    
    // Etsy API'sine listing oluştur
    const etsyListingUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings`;
    
    const etsyFormData = new FormData();
    
    // Listing verisini ekle - ENHANCED VALIDATION
    etsyFormData.append('quantity', (listingData.quantity || 4).toString());
    
    // Title validation ve temizleme
    let cleanTitle = (listingData.title || 'Untitled Product').trim();
    // Etsy'nin desteklemediği karakterleri temizle
    cleanTitle = cleanTitle.replace(/[^\w\s\-\.\(\)\[\]\/\&\'\,\:\!]/g, '');
    // 140 karakter limitini kontrol et
    if (cleanTitle.length > 140) {
      cleanTitle = cleanTitle.substring(0, 137) + '...';
    }
    etsyFormData.append('title', cleanTitle);
    console.log('🔤 Title temizlendi:', { original: listingData.title, clean: cleanTitle });
    
    // Description validation ve temizleme
    let cleanDescription = (listingData.description || 'No description provided').trim();
    // Çok uzunsa kes (Etsy limit: 13000 karakter)
    if (cleanDescription.length > 13000) {
      cleanDescription = cleanDescription.substring(0, 12990) + '...';
    }
    // Problem yaratabilecek karakterleri temizle
    cleanDescription = cleanDescription.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    etsyFormData.append('description', cleanDescription);
    console.log('📝 Description temizlendi:', { originalLength: listingData.description?.length || 0, cleanLength: cleanDescription.length });
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
    
    // Shipping profile sadece fiziksel ürünler için
    if (listingData.type !== 'download') {
      etsyFormData.append('shipping_profile_id', shippingProfileId.toString());
    }
    // return_policy_id sadece varsa ekle (Etsy integer bekliyor)
    if (listingData.return_policy_id && listingData.return_policy_id !== '') {
      etsyFormData.append('return_policy_id', listingData.return_policy_id.toString());
    }
    // Etsy Materials Temizleme Fonksiyonu - ENHANCED
    function cleanEtsyMaterials(materials: string[]): string[] {
      return materials
        .filter(material => material && material.trim().length > 0)
        .map(material => {
          let cleanMaterial = material.trim();
          // Özel karakterleri temizle
          cleanMaterial = cleanMaterial.replace(/[^\w\s\-\.\(\)]/g, '');
          // 20 karakter limitini kontrol et
          if (cleanMaterial.length > 20) {
            cleanMaterial = cleanMaterial.substring(0, 20);
          }
          return cleanMaterial;
        })
        .filter(material => material.length > 0)
        .slice(0, 13); // Etsy maksimum 13 material
    }
    
    // Materials'ı sadece fiziksel ürünler için ekle - digital ürünlerde materials yok
    let materials: string[] = [];
    if (listingData.type !== 'download') {
      materials = listingData.materials && listingData.materials.length > 0 
        ? cleanEtsyMaterials(listingData.materials) 
        : ['Cotton Canvas', 'Wood Frame', 'Hanger']; // Eski çalışan default materials
      
      // Materials'ı eski format ile ekle
      materials.forEach(material => {
        etsyFormData.append('materials[]', material);
      });
      console.log('🧱 Physical ürün - Materials eklendi:', materials.length, 'adet');
    } else {
      console.log('💾 Digital ürün - Materials atlandı (gerekli değil)');
    }
    
    // Personalization instructions temizleme - VALIDATION SUMMARY'DEN ÖNCE TANIMLA
    let cleanInstructions = 'Phone Number for Delivery'; // Default
    if (typeof listingData.personalization_instructions === 'string' && listingData.personalization_instructions.length > 0) {
      cleanInstructions = listingData.personalization_instructions.trim();
      // Özel karakterleri temizle
      cleanInstructions = cleanInstructions.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      // 255 karakter limitini kontrol et
      if (cleanInstructions.length > 255) {
        cleanInstructions = cleanInstructions.substring(0, 255);
      }
    }
    
    // shop_section_id sadece varsa ekle (Etsy integer bekliyor)
    console.log('🏪 Shop section kontrolü:', {
      shop_section_id: listingData.shop_section_id,
      type: typeof listingData.shop_section_id,
      isEmpty: listingData.shop_section_id === '',
      isZero: listingData.shop_section_id === 0,
      isNull: listingData.shop_section_id === null,
      isUndefined: listingData.shop_section_id === undefined
    });
    
    // Shop Section ID'yi sadece geçerliyse ekle - önce doğrula
    const sectionId = Number(listingData.shop_section_id);
    if (sectionId && sectionId > 0) {
      // Shop section'ın geçerli olup olmadığını kontrol et
      console.log(`🔍 Shop section ${sectionId} doğrulanıyor...`);
      
      try {
        const sectionsResponse = await fetch(`https://openapi.etsy.com/v3/application/shops/${shop_id}/sections`, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-api-key': api_key,
          }
        });
        
        if (sectionsResponse.ok) {
          const sectionsData = await sectionsResponse.json();
          const validSection = sectionsData.results?.find((s: any) => s.shop_section_id === sectionId);
          
          if (validSection) {
            console.log(`✅ Shop section ${sectionId} geçerli, Etsy'ye gönderiliyor...`);
            etsyFormData.append('shop_section_id', sectionId.toString());
            console.log(`✅ Ürün, dükkan bölümü "${validSection.title}" (${sectionId})'e eklenecek.`);
          } else {
            console.log(`❌ Shop section ${sectionId} artık geçerli değil. Mevcut sections:`, 
              sectionsData.results?.map((s: any) => `${s.shop_section_id}: ${s.title}`) || []);
            console.log(`⚠️ Ürün ana sayfada yer alacak (section ID geçersiz).`);
          }
        } else {
          console.log(`⚠️ Shop sections alınamadı (${sectionsResponse.status}), section ID kullanılmayacak.`);
        }
      } catch (sectionError) {
        console.error('❌ Shop section doğrulama hatası:', sectionError);
        console.log(`⚠️ Section doğrulama başarısız, ürün ana sayfada yer alacak.`);
      }
    } else {
      console.log(`⚠️ Dükkan bölümü belirtilmedi, ürün ana sayfada yer alacak. (Değer: ${listingData.shop_section_id})`);
    }
    etsyFormData.append('processing_min', '1');
    etsyFormData.append('processing_max', '3');
    // Etsy Tags Temizleme Fonksiyonu - ENHANCED  
    function cleanEtsyTags(tags: string[]): string[] {
      return tags
        .filter(tag => tag && tag.trim().length > 0)
        .map(tag => {
          // Önce trim yaparak başındaki ve sonundaki boşlukları temizle
          let cleanTag = tag.trim();
          
          // Türkçe karakterleri İngilizce karakterlere dönüştür
          cleanTag = cleanTag
            .replace(/ğ/g, 'g')
            .replace(/Ğ/g, 'G')
            .replace(/ü/g, 'u')
            .replace(/Ü/g, 'U')
            .replace(/ş/g, 's')
            .replace(/Ş/g, 'S')
            .replace(/ı/g, 'i')
            .replace(/İ/g, 'I')
            .replace(/ö/g, 'o')
            .replace(/Ö/g, 'O')
            .replace(/ç/g, 'c')
            .replace(/Ç/g, 'C');
          
          // Sadece alfanumerik karakterleri ve boşlukları koru
          cleanTag = cleanTag.replace(/[^a-zA-Z0-9\s]/g, '');
          
          // Küçük harfe dönüştür
          cleanTag = cleanTag.toLowerCase();
          
          // 20 karakter limitini kontrol et
          if (cleanTag.length > 20) {
            cleanTag = cleanTag.substring(0, 20);
          }
          
          return cleanTag;
        })
        .filter(tag => tag.length > 0 && tag.length >= 2) // En az 2 karakter olmalı
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
    
    console.log('🧹 TÜM VERİLER TEMİZLENDİ - VALIDATION SUMMARY:', {
      title: { original: listingData.title?.length || 0, clean: cleanTitle.length, valid: cleanTitle.length <= 140 },
      description: { originalLength: listingData.description?.length || 0, cleanLength: cleanDescription.length, valid: cleanDescription.length <= 13000 },
      tags: { original: listingData.tags?.length || 0, clean: cleanTags.length, valid: cleanTags.length <= 13, tags: cleanTags },
      materials: { original: listingData.materials?.length || 0, clean: materials.length, valid: materials.length <= 13, materials: materials },
      price: { original: listingData.price, final: finalPrice, valid: finalPrice > 0 },
      instructions: { original: listingData.personalization_instructions?.length || 0, clean: cleanInstructions.length, valid: cleanInstructions.length <= 255 },
      allValid: cleanTitle.length <= 140 && cleanDescription.length <= 13000 && cleanTags.length <= 13 && materials.length <= 13 && finalPrice > 0
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
    
    // Personalization instructions FormData'ya ekle (cleanInstructions yukarıda tanımlandı)
    etsyFormData.append('personalization_instructions', cleanInstructions);
    console.log('📋 Personalization instructions temizlendi:', { original: listingData.personalization_instructions, clean: cleanInstructions });
    
    if (typeof listingData.personalization_char_count_max !== 'undefined') {
      etsyFormData.append('personalization_char_count_max', listingData.personalization_char_count_max.toString());
    } else {
      etsyFormData.append('personalization_char_count_max', '255'); // Default
    }
    etsyFormData.append('is_supply', (listingData.is_supply || false).toString());
    etsyFormData.append('is_customizable', 'true');
    etsyFormData.append('should_auto_renew', listingData.renewal_option === 'automatic' ? 'true' : 'false');
    etsyFormData.append('state', 'draft'); // Her zaman draft olarak başla, sonra resim ekleyip activate ederiz
    
    // Add type field for digital products (critical for Etsy API)
    if (listingData.type === 'download') {
      etsyFormData.append('type', 'download');
      // Digital ürünler için taxonomy_id = 688 (Digital Prints)
      etsyFormData.delete('taxonomy_id');
      etsyFormData.append('taxonomy_id', '688');
      console.log('📦 Digital product detected - type: download, taxonomy_id: 688, shipping_profile_id not added');
    } else {
      etsyFormData.append('type', 'physical');
      console.log('📦 Physical product detected - type: physical field added to Etsy FormData');
    }
    
    console.log('✅ Type field validation:', {
      listingData_type: listingData.type,
      formData_includes_type: Array.from(etsyFormData.keys()).includes('type'),
      taxonomy_id: listingData.taxonomy_id
    });
    
    // NOT: Varyasyonlar draft listing oluşturduktan sonra ayrı API call'la eklenecek
    
    // NOT: Resimler ayrı endpoint'e upload edilecek - burada eklenmez
    
    // NOT: Video da ayrı endpoint'e upload edilecek - burada eklenmez
    
    // TESTING MODE: Minimal data ile test et
    const TESTING_MODE = false;
    
    if (TESTING_MODE) {
      console.log('🧪 TESTING MODE ACTIVE - Minimal data ile test ediliyor...');
      
      // Tüm form data'yı temizle ve minimal set kullan
      const minimalFormData = new FormData();
      minimalFormData.append('quantity', '1');
      minimalFormData.append('title', 'Test Canvas Art');
      minimalFormData.append('description', 'Test description for canvas art print.');
      minimalFormData.append('price', '25.00');
      minimalFormData.append('who_made', 'i_did');
      minimalFormData.append('when_made', 'made_to_order');
      minimalFormData.append('taxonomy_id', '1027');
      minimalFormData.append('shipping_profile_id', shippingProfileId.toString());
      minimalFormData.append('state', 'draft');
      
      // Test tags (sadece 3 adet)
      minimalFormData.append('tags[]', 'art');
      minimalFormData.append('tags[]', 'canvas');
      minimalFormData.append('tags[]', 'print');
      
      // Test materials (sadece 2 adet)
      minimalFormData.append('materials[]', 'Canvas');
      minimalFormData.append('materials[]', 'Wood');
      
      console.log('🧪 Minimal test data:', {
        keys: Array.from(minimalFormData.keys()),
        title: 'Test Canvas Art',
        price: '25.00',
        tags: ['art', 'canvas', 'print'],
        materials: ['Canvas', 'Wood']
      });
      
      // Test API call
      try {
        const testResponse = await fetch(etsyListingUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-api-key': api_key,
          },
          body: minimalFormData,
        });
        
        console.log('🧪 Test API Response:', {
          status: testResponse.status,
          ok: testResponse.ok,
          statusText: testResponse.statusText
        });
        
        if (!testResponse.ok) {
          const testErrorText = await testResponse.text();
          console.log('🧪 Test API Error Text:', testErrorText);
          
          return NextResponse.json({
            error: `TEST MODE - Etsy API Error: ${testErrorText}`,
            testMode: true,
            minimalData: true,
            status: testResponse.status
          }, { status: testResponse.status });
        }
        
        const testResult = await testResponse.json();
        console.log('✅ TEST BAŞARILI! Minimal data çalışıyor:', testResult.listing_id);
        
        return NextResponse.json({
          success: true,
          testMode: true,
          message: 'Test başarılı - minimal data çalışıyor',
          listing_id: testResult.listing_id
        });
        
      } catch (testError) {
        console.error('🧪 Test error:', testError);
        return NextResponse.json({
          error: `Test mode error: ${testError.message}`,
          testMode: true
        }, { status: 500 });
      }
    }

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
      let etsyResponse = await fetch(etsyListingUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'x-api-key': api_key,
        },
        body: etsyFormData,
        signal: controller.signal,
      });
      
      // 401 hatası alındıysa token'ı yenile ve tekrar dene
      if (etsyResponse.status === 401) {
        console.log('⚠️ Etsy API 401 hatası, token yenileniyor...');
        
        try {
          const { refreshEtsyToken } = await import('@/lib/etsy-api');
          const newToken = await refreshEtsyToken(shop_id);
          
          if (newToken) {
            console.log('✅ Etsy token başarıyla yenilendi, istek tekrarlanıyor');
            access_token = newToken;
            
            // İsteği yeni token ile tekrarla
            etsyResponse = await fetch(etsyListingUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${access_token}`,
                'x-api-key': api_key,
              },
              body: etsyFormData,
              signal: controller.signal,
            });
          } else {
            console.error('❌ Etsy token yenilenemedi');
            return NextResponse.json({
              error: 'Etsy bağlantısı kesildi. Lütfen Etsy hesabınızı yeniden bağlayın.',
              code: 'REFRESH_TOKEN_FAILED'
            }, { status: 401 });
          }
        } catch (refreshError) {
          console.error('❌ Token yenileme hatası:', refreshError);
          return NextResponse.json({
            error: 'Etsy bağlantısı kesildi. Lütfen Etsy hesabınızı yeniden bağlayın.',
            code: 'REFRESH_TOKEN_ERROR'
          }, { status: 401 });
        }
      }
      
      clearTimeout(timeoutId);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      // Rate limit bilgilerini al
      const dailyRemaining = etsyResponse.headers.get('x-remaining-today');
      const dailyLimit = etsyResponse.headers.get('x-limit-per-day');
      const secondRemaining = etsyResponse.headers.get('x-remaining-this-second');
      const secondLimit = etsyResponse.headers.get('x-limit-per-second');
      
      console.log('📥 Etsy API yanıtı:', etsyResponse.status, etsyResponse.ok, `(${duration}s)`);
      console.log('⚡ Rate Limit:', `${dailyRemaining}/${dailyLimit} günlük kalan | ${secondRemaining}/${secondLimit} saniyelik`);
    
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
      console.log(`📤 ADIM 2: ${imageFiles.length} resim PARALELde upload ediliyor...`);
      
      // ChatGPT önerisi: Paralel upload function
      const uploadImage = async (file: File, index: number) => {
        console.log(`📷 Resim ${index + 1}/${imageFiles.length} upload ediliyor:`, file.name, (file.size / 1024 / 1024).toFixed(2), 'MB');
        
        try {
          const imageFormData = new FormData();
          imageFormData.append('image', file);
          imageFormData.append('rank', (index + 1).toString());
          imageFormData.append('alt_text', `Image ${index + 1} of ${listingData.title}`);
          
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
            console.log(`✅ Resim ${index + 1} başarıyla upload edildi:`, imageResult.listing_image_id);
            return true;
          } else {
            const errorText = await imageResponse.text();
            console.error(`❌ Resim ${index + 1} upload hatası:`, imageResponse.status, errorText);
            return false;
          }
        } catch (imageError) {
          console.error(`❌ Resim ${index + 1} upload exception:`, imageError);
          return false;
        }
      };

      // Sıralı upload - güvenli ve hızlı
      console.log('🔄 Sıralı upload başlıyor (50ms ara ile)...');
      
      for (let i = 0; i < imageFiles.length; i++) {
        const success = await uploadImage(imageFiles[i], i);
        if (success) {
          uploadedImageCount++;
        }
        
        // Kısa bekleme (409 hatasını önlemek için)
        if (i < imageFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      console.log(`📊 Resim upload özeti: ${uploadedImageCount}/${imageFiles.length} başarılı`);
    }
    
    // ADIM 2.5: Video upload et (eğer varsa)
    let videoUploaded = false;
    if (videoFile) {
      console.log('📤 ADIM 2.5: Video upload ediliyor...');
      console.log(`🎥 Video upload ediliyor:`, videoFile.name, (videoFile.size / 1024 / 1024).toFixed(2), 'MB');
      
      // Video validasyonu
      const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB limit
      const SUPPORTED_VIDEO_TYPES = [
        'video/mp4', 'video/mov', 'video/avi', 'video/quicktime',
        'video/x-msvideo', 'video/mpeg', 'video/webm'
      ];
      
      if (videoFile.size > MAX_VIDEO_SIZE) {
        console.error(`❌ Video dosyası çok büyük: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB (max: 100MB)`);
      } else if (!SUPPORTED_VIDEO_TYPES.includes(videoFile.type)) {
        console.error(`❌ Desteklenmeyen video formatı: ${videoFile.type}`);
      } else {
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
          
          // Daha uzun timeout video yükleme için
          const videoController = new AbortController();
          const videoTimeout = setTimeout(() => videoController.abort(), 120000); // 2 dakika timeout
          
          const videoResponse = await fetch(videoUploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'x-api-key': api_key,
            },
            body: videoFormData,
            signal: videoController.signal
          });
          
          clearTimeout(videoTimeout);
          
          if (videoResponse.ok) {
            const videoResult = await videoResponse.json();
            videoUploaded = true;
            console.log(`✅ Video başarıyla upload edildi:`, {
              video_id: videoResult.video_id,
              video_url: videoResult.video_url,
              status: videoResult.status
            });
          } else {
            let errorDetails;
            try {
              errorDetails = await videoResponse.json();
            } catch {
              errorDetails = await videoResponse.text();
            }
            
            console.error(`❌ Video upload hatası:`, {
              status: videoResponse.status,
              statusText: videoResponse.statusText,
              error: errorDetails,
              videoSize: `${(videoFile.size / 1024 / 1024).toFixed(2)}MB`,
              videoType: videoFile.type,
              videoName: videoFile.name
            });
            console.error(`🔗 Video upload URL:`, videoUploadUrl);
          }
        } catch (videoError) {
          if (videoError.name === 'AbortError') {
            console.error(`❌ Video upload timeout (2 dakika):`, videoFile.name);
          } else {
            console.error(`❌ Video upload exception:`, {
              error: videoError.message,
              stack: videoError.stack,
              videoName: videoFile.name,
              videoSize: `${(videoFile.size / 1024 / 1024).toFixed(2)}MB`
            });
          }
        }
      }
    }
    
    // ADIM 2.7: Digital dosyalar ekle (digital ürünler için)
    let uploadedDigitalFiles = 0;
    if (listingData.type === 'download' && digitalFiles && digitalFiles.length > 0) {
      console.log(`📤 ADIM 2.7: ${digitalFiles.length} digital dosya yükleniyor...`);
      
      for (let i = 0; i < digitalFiles.length; i++) {
        const digitalFile = digitalFiles[i];
        console.log(`📁 Digital dosya ${i + 1}/${digitalFiles.length} yükleniyor:`, digitalFile.name, (digitalFile.size / 1024 / 1024).toFixed(2), 'MB');
        
        try {
          const digitalFormData = new FormData();
          digitalFormData.append('file', digitalFile);
          
          // Dosya ismini Etsy kurallarına uygun hale getir
          // Sadece dosya adını al (klasör yolunu kaldır)
          const fullPath = digitalFile.name;
          // Dosya adının sadece son kısmını al (klasör yolları olmadan)
          const fileName = fullPath.split('/').pop()?.split('\\').pop() || fullPath;
          
          console.log(`📄 Orijinal dosya adı: "${digitalFile.name}"`);
          console.log(`📄 Temizlenmiş dosya adı: "${fileName}"`);
          
          // Dosya uzantısını al
          const fileExtension = fileName.match(/\.[^/.]+$/) ? fileName.match(/\.[^/.]+$/)[0] : '';
          const isJpgOrPng = fileExtension.toLowerCase() === '.jpg' ||
                            fileExtension.toLowerCase() === '.jpeg' ||
                            fileExtension.toLowerCase() === '.png';
          
          if (!isJpgOrPng) {
            console.log(`⚠️ Desteklenmeyen dosya formatı: ${fileName} - Sadece JPG ve PNG dosyaları desteklenir`);
            continue; // Bu dosyayı atla
          }
          
          // Dosya adını olduğu gibi koru
          let cleanFileName = fileName;
          
          // Sadece dosya adı uzunluğunu kontrol et ve gerekirse kısalt
          if (cleanFileName.length > 70) {
            // Uzantıyı koru, sadece adı kısalt
            const nameWithoutExt = cleanFileName.replace(/\.[^/.]+$/, "");
            const shortenedName = nameWithoutExt.substring(0, 70 - fileExtension.length);
            cleanFileName = shortenedName + fileExtension;
          }
          
          // En az 3 karakter olmalı
          if (cleanFileName.replace(/\.[^/.]+$/, "").length < 3) {
            // Orijinal dosya adını koru, sadece çok kısaysa file_X kullan
            if (fileName.length < 3) {
              cleanFileName = `file_${i + 1}${fileExtension}`;
            }
          }
          
          console.log(`📝 Dosya ismi korundu: "${fileName}" → "${cleanFileName}"`);
          
          console.log(`📝 Dosya ismi temizlendi: "${digitalFile.name}" → "${cleanFileName}"`);
          digitalFormData.append('name', cleanFileName);
          digitalFormData.append('rank', (i + 1).toString());
          
          console.log(`📝 Dosya ismi temizlendi: "${digitalFile.name}" → "${cleanFileName}"`);
          
          const digitalUploadUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings/${etsyResult.listing_id}/files`;
          
          const digitalResponse = await fetch(digitalUploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'x-api-key': api_key,
            },
            body: digitalFormData,
          });
          
          if (digitalResponse.ok) {
            const digitalResult = await digitalResponse.json();
            uploadedDigitalFiles++;
            console.log(`✅ Digital dosya ${i + 1} başarıyla yüklendi:`, digitalResult.listing_file_id);
          } else {
            const errorText = await digitalResponse.text();
            console.error(`❌ Digital dosya ${i + 1} yükleme hatası:`, digitalResponse.status, errorText);
          }
        } catch (digitalError) {
          console.error(`❌ Digital dosya ${i + 1} yükleme exception:`, digitalError);
        }
        
        // Rate limit için kısa bekleme
        if (i < digitalFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`📊 Digital dosya yükleme özeti: ${uploadedDigitalFiles}/${digitalFiles.length} başarılı`);
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
    console.log('⚡ Rate Limit Durumu:', `${dailyRemaining}/${dailyLimit} günlük kalan | ${secondRemaining}/${secondLimit} saniyelik`);
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
        daily_remaining: dailyRemaining,
        daily_limit: dailyLimit,
        second_remaining: secondRemaining,
        second_limit: secondLimit
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