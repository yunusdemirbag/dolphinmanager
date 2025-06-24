import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { queueItemId, isDraft = true } = await request.json();
    
    if (!queueItemId) {
      return NextResponse.json({ error: 'Queue item ID is required' }, { status: 400 });
    }

    // Firebase bağlantısını başlat
    initializeAdminApp();
    
    if (!adminDb) {
      console.error('Firebase Admin not initialized');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Kuyruk öğesini al
    const queueDoc = await adminDb.collection('queue').doc(queueItemId).get();
    if (!queueDoc.exists) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    const queueData = queueDoc.data()!;
    
    // Queue data'nın boyutunu kontrol et
    console.log('🔍 Queue data field sizes:');
    Object.entries(queueData).forEach(([key, value]) => {
      const valueString = typeof value === 'string' ? value : JSON.stringify(value);
      console.log(`  ${key}: ${valueString.length} karakter`);
      if (valueString.length > 1000) {
        console.log(`    ⚠️ ${key} büyük! İlk 100 karakter:`, valueString.substring(0, 100));
      }
    });

    // Kuyruk durumunu processing olarak güncelle
    await adminDb.collection('queue').doc(queueItemId).update({
      status: 'processing',
      updated_at: new Date()
    });

    try {
      // Resimleri ve videoyu yükle
      let images: any[] = [];
      let video: any = null;

      // Resimleri yükle
      if (queueData.image_refs && queueData.image_refs.length > 0) {
        for (const imageId of queueData.image_refs) {
          try {
            const imageDoc = await adminDb.collection('queue_images').doc(imageId).get();
            if (imageDoc.exists) {
              const imageData = imageDoc.data()!;
              
              // Parçaları yükle ve birleştir
              if (imageData.chunks_count > 0) {
                const chunkQuery = await adminDb.collection('queue_image_chunks')
                  .where('image_id', '==', imageId)
                  .get();
                
                const chunks: { [key: number]: string } = {};
                chunkQuery.forEach(chunkDoc => {
                  const chunkData = chunkDoc.data();
                  chunks[chunkData.chunk_index] = chunkData.chunk_data;
                });
                
                const sortedChunks = Object.keys(chunks)
                  .sort((a, b) => Number(a) - Number(b))
                  .map(key => chunks[Number(key)]);
                
                const combinedBase64 = sortedChunks.join('');
                
                images.push({
                  ...imageData,
                  base64: combinedBase64
                });
              } else {
                images.push(imageData);
              }
            }
          } catch (imageError) {
            console.error('Error loading image:', imageError);
          }
        }
      }

      // Video'yu yükle
      if (queueData.video_ref) {
        try {
          const videoDoc = await adminDb.collection('queue_videos').doc(queueData.video_ref).get();
          if (videoDoc.exists) {
            const videoData = videoDoc.data()!;
            
            if (videoData.chunks_count > 0) {
              const chunkQuery = await adminDb.collection('queue_video_chunks')
                .where('video_id', '==', queueData.video_ref)
                .get();
              
              const chunks: { [key: number]: string } = {};
              chunkQuery.forEach(chunkDoc => {
                const chunkData = chunkDoc.data();
                chunks[chunkData.chunk_index] = chunkData.chunk_data;
              });
              
              const sortedChunks = Object.keys(chunks)
                .sort((a, b) => Number(a) - Number(b))
                .map(key => chunks[Number(key)]);
              
              const combinedBase64 = sortedChunks.join('');
              
              video = {
                ...videoData,
                base64: combinedBase64
              };
            } else {
              video = videoData;
            }
          }
        } catch (videoError) {
          console.error('Error loading video:', videoError);
        }
      }

      // Base64'ten Blob objesine dönüştürme fonksiyonu (server-side için)
      const base64ToBlob = (base64: string, filename: string, mimeType: string) => {
        const byteCharacters = atob(base64.split(',')[1] || base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        
        // Blob'a filename property'si ekle (FormData için gerekli)
        Object.defineProperty(blob, 'name', {
          writable: false,
          value: filename
        });
        
        return blob;
      };

      // FormData oluştur (create endpoint FormData bekliyor)
      const formData = new FormData();
      
      // Shipping profile ID'yi Firebase'den al
      let shippingProfileId = null;
      try {
        const shippingProfilesSnapshot = await adminDb
          .collection('shipping_profiles')
          .where('user_id', '==', queueData.user_id)
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
            // Önce store bilgilerini al
            const storesSnapshot = await adminDb
              .collection('etsy_stores')
              .where('user_id', '==', queueData.user_id)
              .where('is_active', '==', true)
              .get();
            
            if (!storesSnapshot.empty) {
              const storeData = storesSnapshot.docs[0];
              const shop_id = storeData.id;
              
              // API keys al
              const apiKeysDoc = await adminDb.collection('etsy_api_keys').doc(shop_id).get();
              
              if (apiKeysDoc.exists) {
                const { access_token, api_key } = apiKeysDoc.data()!;
                
                // Etsy API'den shipping profiles al
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
        throw new Error('Geçerli bir shipping profile bulunamadı. Lütfen Etsy\'de en az bir kargo profili oluşturun.');
      }

      // Description'dan base64 data'yı agresif şekilde temizle (eski queue item'ları için)
      let cleanDescription = queueData.description || '';
      
      if (typeof cleanDescription === 'string') {
        // 1. Standart data:image base64 formatını temizle
        cleanDescription = cleanDescription.replace(/data:image\/[^;]+;base64,[\w+/=]+/g, '[IMAGE_REMOVED]');
        
        // 2. Herhangi bir uzun base64 string'i temizle (100+ karakter)
        cleanDescription = cleanDescription.replace(/[A-Za-z0-9+/]{100,}={0,2}/g, '[LONG_STRING_REMOVED]');
        
        // 3. JSON içindeki base64 alanlarını temizle
        cleanDescription = cleanDescription.replace(/"base64"\s*:\s*"[^"]{100,}"/g, '"base64":"[REMOVED]"');
        
        // 4. Eğer hala çok büyükse, ilk 500 karaktere kırp
        if (cleanDescription.length > 1000) {
          cleanDescription = cleanDescription.substring(0, 500) + '... [TRUNCATED]';
        }
      }

      console.log('🧹 Process endpoint - Description temizlendi:', {
        original_length: queueData.description?.length || 0,
        cleaned_length: cleanDescription.length,
        contains_base64: queueData.description?.includes('base64') || false
      });

      // Listing verisini JSON string olarak ekle - BASE64 DATA TEMİZLENDİ!
      const listingData = {
        title: queueData.title,
        description: cleanDescription,
        price: Math.max(queueData.price || 10, 10), // Minimum 10 cent
        quantity: 1,
        tags: queueData.tags || [],
        taxonomy_id: queueData.taxonomy_id,
        who_made: 'i_did',
        when_made: 'made_to_order',
        shipping_profile_id: shippingProfileId,
        return_policy_id: '', // Empty string if not set
        shop_section_id: '', // Empty string if not set
        is_personalizable: false,
        personalization_is_required: false,
        personalization_char_count_max: 0,
        personalization_instructions: '',
        is_supply: false,
        renewal_option: 'automatic',
        state: isDraft ? 'draft' : 'active',
        has_variations: queueData.has_variations || false,
        variations: (() => {
          try {
            const originalVariations = JSON.parse(queueData.variations_json || '[]');
            // Variations'daki base64 data'yı temizle
            return originalVariations.map((variation: any) => {
              const cleanVar = { ...variation };
              Object.keys(cleanVar).forEach(key => {
                if (typeof cleanVar[key] === 'string') {
                  cleanVar[key] = cleanVar[key].replace(/data:image\/[^;]+;base64,[\w+/=]+/g, '[IMAGE_REMOVED]');
                  cleanVar[key] = cleanVar[key].replace(/[A-Za-z0-9+/]{100,}={0,2}/g, '[LONG_STRING_REMOVED]');
                  if (cleanVar[key].length > 200) {
                    cleanVar[key] = cleanVar[key].substring(0, 100) + '... [TRUNCATED]';
                  }
                }
              });
              return cleanVar;
            });
          } catch (error) {
            console.error('❌ Variations parse hatası:', error);
            return [];
          }
        })()
        // NOT: images ve video base64 data'sı burada DEĞİL, FormData'da ayrı olarak ekleniyor
      };
      
      // Her alanı kontrol et ve büyük olanları temizle
      console.log('🔍 ListingData alanlarının boyutları:');
      Object.entries(listingData).forEach(([key, value]) => {
        const valueString = typeof value === 'string' ? value : JSON.stringify(value);
        console.log(`  ${key}: ${valueString.length} karakter`);
        if (valueString.length > 10000) {
          console.log(`    ⚠️ ${key} çok büyük! İlk 100 karakter:`, valueString.substring(0, 100));
          console.log(`    ⚠️ ${key} son 100 karakter:`, valueString.slice(-100));
          
          // Büyük alanları temizle
          if (typeof value === 'string') {
            let cleanValue = value;
            cleanValue = cleanValue.replace(/data:image\/[^;]+;base64,[\w+/=]+/g, '[IMAGE_REMOVED]');
            cleanValue = cleanValue.replace(/[A-Za-z0-9+/]{100,}={0,2}/g, '[LONG_STRING_REMOVED]');
            if (cleanValue.length > 1000) {
              cleanValue = cleanValue.substring(0, 500) + '... [TRUNCATED]';
            }
            listingData[key] = cleanValue;
            console.log(`    ✅ ${key} temizlendi, yeni boyut:`, cleanValue.length);
          }
        }
      });
      
      const listingDataString = JSON.stringify(listingData);
      console.log('📋 Listing data string length:', listingDataString.length);
      console.log('📋 Listing data preview:', listingDataString.substring(0, 200));
      console.log('📋 String truncation check - son 50 karakter:', listingDataString.slice(-50));
      
      // String length kontrolü
      if (listingDataString.length > 100000) { // 100KB limit
        console.error('❌ Listing data string çok büyük!', {
          length: listingDataString.length,
          limit: 100000,
          keys: Object.keys(listingData)
        });
        throw new Error(`Listing data çok büyük: ${listingDataString.length} karakter (limit: 100,000)`);
      }
      
      formData.append('listingData', listingDataString);
      
      // Resimleri Blob olarak ekle
      if (images && images.length > 0) {
        images.forEach((image, index) => {
          if (image.base64) {
            const blob = base64ToBlob(image.base64, `image_${index}.${image.type.split('/')[1]}`, image.type);
            formData.append(`imageFile_${index}`, blob);
            console.log(`📸 Added image ${index}:`, blob.size, 'bytes');
          }
        });
      }
      
      // Video'yu Blob olarak ekle
      if (video && video.base64) {
        const videoBlob = base64ToBlob(video.base64, `video.${video.type.split('/')[1]}`, video.type);
        formData.append('videoFile', videoBlob);
        console.log('🎥 Added video:', videoBlob.size, 'bytes');
      }
      
      console.log('📦 FormData keys:', Array.from(formData.keys()));

      // Mevcut Etsy listing creation API'sini kullan - localhost için içeride çağır
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3002' 
        : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002');
      console.log('🌐 Calling create API:', `${apiUrl}/api/etsy/listings/create`);
      
      const etsyResponse = await fetch(`${apiUrl}/api/etsy/listings/create`, {
        method: 'POST',
        body: formData
      });

      if (!etsyResponse.ok) {
        const errorData = await etsyResponse.json();
        console.error('❌ /api/etsy/listings/create hatası:', {
          status: etsyResponse.status,
          statusText: etsyResponse.statusText,
          errorData: errorData
        });
        throw new Error(errorData.error || errorData.message || `HTTP ${etsyResponse.status}: ${etsyResponse.statusText}`);
      }

      const etsyResult = await etsyResponse.json();

      // Başarılı durumu kaydet
      await adminDb.collection('queue').doc(queueItemId).update({
        status: 'completed',
        etsy_listing_id: etsyResult.listing_id,
        processed_at: new Date(),
        updated_at: new Date()
      });

      return NextResponse.json({ 
        success: true,
        listing_id: etsyResult.listing_id,
        message: `Product successfully sent to Etsy as ${isDraft ? 'draft' : 'active'}`
      });

    } catch (processingError) {
      console.error('Error processing queue item:', processingError);
      
      // Hata durumunu kaydet
      await adminDb.collection('queue').doc(queueItemId).update({
        status: 'failed',
        error_message: processingError instanceof Error ? processingError.message : 'Unknown error',
        updated_at: new Date()
      });

      throw processingError;
    }

  } catch (error) {
    console.error('Process queue item error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process queue item' 
    }, { status: 500 });
  }
}