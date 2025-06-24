import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

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
      hasVideo: !!(listingData.video || listingData.videoUrl)
    });
    
    // Firebase Admin'i initialize et
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }
    
    // Kullanıcının Etsy credentials'ını al
    const userId = 'local-user-123'; // Bu gerçek auth context'den gelecek
    const userDoc = await adminDb.collection('etsy_users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ 
        error: 'Etsy hesabınız bağlı değil', 
        code: 'NO_ETSY_TOKEN' 
      }, { status: 400 });
    }
    
    const userData = userDoc.data()!;
    const { shop_id, access_token, api_key } = userData;
    
    if (!access_token || !api_key) {
      return NextResponse.json({ 
        error: 'Etsy token geçersiz', 
        code: 'INVALID_ETSY_TOKEN' 
      }, { status: 400 });
    }
    
    console.log('🔑 Etsy credentials alındı, shop_id:', shop_id);
    
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
    
    // Etsy API'sine listing oluştur
    const etsyListingUrl = `https://openapi.etsy.com/v3/application/shops/${shop_id}/listings`;
    
    const etsyFormData = new FormData();
    
    // Listing verisini ekle
    etsyFormData.append('quantity', listingData.quantity.toString());
    etsyFormData.append('title', listingData.title);
    etsyFormData.append('description', listingData.description);
    etsyFormData.append('price', listingData.price.toString());
    etsyFormData.append('who_made', listingData.who_made);
    etsyFormData.append('when_made', listingData.when_made);
    etsyFormData.append('taxonomy_id', listingData.taxonomy_id.toString());
    etsyFormData.append('shipping_profile_id', listingData.shipping_profile_id.toString());
    etsyFormData.append('return_policy_id', listingData.return_policy_id?.toString() || '');
    etsyFormData.append('materials', JSON.stringify(['Cotton Canvas', 'Wood Frame', 'Hanger']));
    etsyFormData.append('shop_section_id', listingData.shop_section_id?.toString() || '');
    etsyFormData.append('processing_min', '1');
    etsyFormData.append('processing_max', '3');
    etsyFormData.append('tags', JSON.stringify(listingData.tags));
    etsyFormData.append('is_personalizable', listingData.is_personalizable.toString());
    etsyFormData.append('personalization_is_required', listingData.personalization_is_required.toString());
    etsyFormData.append('personalization_char_count_max', listingData.personalization_char_count_max.toString());
    etsyFormData.append('personalization_instructions', listingData.personalization_instructions);
    etsyFormData.append('is_supply', listingData.is_supply.toString());
    etsyFormData.append('is_customizable', 'true');
    etsyFormData.append('should_auto_renew', listingData.renewal_option === 'automatic' ? 'true' : 'false');
    etsyFormData.append('state', listingData.state); // draft veya active
    
    // Varyasyonları ekle
    if (listingData.has_variations && listingData.variations?.length > 0) {
      const variations = listingData.variations.map((variation: any, idx: number) => ({
        property_id: 513, // Size property ID
        value_id: null,
        value: variation.size,
        price: variation.price,
        is_active: variation.is_active
      }));
      etsyFormData.append('inventory', JSON.stringify(variations));
    }
    
    // Resimleri ekle
    if (imageFiles.length > 0) {
      console.log('📷 Resimler ekleniyor, toplam:', imageFiles.length);
      imageFiles.forEach((imageFile, index) => {
        console.log(`📷 Resim ${index + 1}:`, imageFile.name, (imageFile.size / 1024 / 1024).toFixed(2), 'MB');
        etsyFormData.append(`image`, imageFile);
      });
    }
    
    // Video ekle (eğer varsa)
    if (listingData.videoUrl) {
      etsyFormData.append('video_url', listingData.videoUrl);
    }
    
    console.log('📤 Etsy API\'sine gönderiliyor...');
    console.log('⏰ Başlangıç zamanı:', new Date().toISOString());
    console.log('📋 Listing state:', listingData.state);
    console.log('📋 Image count:', imageFiles.length);
    console.log('📋 Video URL:', !!listingData.videoUrl);
    console.log('📋 API URL:', etsyListingUrl);
    console.log('📋 Form data keys:', Array.from(etsyFormData.keys()));
    
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
      console.log('📥 Etsy API yanıtı:', etsyResponse.status, etsyResponse.ok, `(${duration}s)`);
    
      const etsyResult = await etsyResponse.json();
      console.log('📋 Response data keys:', Object.keys(etsyResult));
      
      if (!etsyResponse.ok) {
        console.error('❌ Etsy API hatası:', etsyResult);
        return NextResponse.json({
          error: `Etsy API Error: ${etsyResult.error || 'Unknown error'}`,
          details: etsyResult,
          code: 'ETSY_API_ERROR'
        }, { status: etsyResponse.status });
      }
    
    console.log('✅ Etsy listing oluşturuldu:', etsyResult.listing_id);
    
    // Firebase'e başarılı listing'i kaydet
    await adminDb.collection('etsy_listings').doc(etsyResult.listing_id.toString()).set({
      user_id: userId,
      shop_id: shop_id,
      listing_id: etsyResult.listing_id,
      title: listingData.title,
      state: listingData.state,
      created_at: new Date(),
      etsy_data: etsyResult
    });
    
    return NextResponse.json({
      success: true,
      listing_id: etsyResult.listing_id,
      listing: etsyResult,
      message: `Listing ${listingData.state === 'draft' ? 'taslak olarak' : 'aktif olarak'} oluşturuldu!`
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