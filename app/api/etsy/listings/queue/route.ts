import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

// Base64'ü küçük parçalara böl (1MB altı)
const chunkBase64 = (base64: string, chunkSize: number = 900000): string[] => {
  const chunks = [];
  for (let i = 0; i < base64.length; i += chunkSize) {
    chunks.push(base64.slice(i, i + chunkSize));
  }
  return chunks;
};

// Parçaları birleştir
const combineChunks = (chunks: string[]): string => {
  return chunks.join('');
};

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Kuyruk API çağrısı başlatıldı');
    
    let listingData;
    let formData: FormData | null = null;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // JSON formatında veri
      const body = await request.json();
      listingData = body.product || body;
      console.log('📋 JSON formatında veri alındı');
    } else if (contentType.includes('multipart/form-data')) {
      // FormData formatında veri
      formData = await request.formData();
      const listingDataString = formData.get('listingData') as string;
      
      console.log('📋 Alınan listingData string:', listingDataString?.substring(0, 100) + '...');
      
      if (!listingDataString) {
        return NextResponse.json({ error: 'Listing data is required' }, { status: 400 });
      }
      
      try {
        listingData = JSON.parse(listingDataString);
      } catch (parseError) {
        console.error('❌ JSON parse hatası:', parseError);
        return NextResponse.json({ error: 'Invalid listing data format' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
    }
    
    if (!listingData) {
      return NextResponse.json({ error: 'Listing data is required' }, { status: 400 });
    }

    // Firebase Admin'i initialize et
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const userId = 'local-user-123'; // Bu gerçek auth context'den gelecek

    // Görselleri ayrı koleksiyonda sakla - Firebase limit için
    const imageRefs: string[] = [];
    if (formData) {
      let index = 0;
      while (true) {
        const imageFile = formData.get(`imageFile_${index}`) as File;
        if (!imageFile) break;
      
      // File'ı base64'e çevir
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      // Base64'ü parçalara böl
      const chunks = chunkBase64(base64);
      console.log(`📷 Resim ${index + 1}: ${chunks.length} parçaya bölündü`);
      
      // Ana resim meta bilgisini sakla
      const imageDoc = await adminDb.collection('queue_images').add({
        type: imageFile.type,
        filename: imageFile.name,
        position: index,
        size: imageFile.size,
        chunks_count: chunks.length,
        created_at: new Date()
      });
      
      // Her parçayı ayrı dokümanda sakla
      const chunkPromises = chunks.map(async (chunk, chunkIndex) => {
        return adminDb.collection('queue_image_chunks').add({
          image_id: imageDoc.id,
          chunk_index: chunkIndex,
          chunk_data: chunk,
          created_at: new Date()
        });
      });
      
        await Promise.all(chunkPromises);
        imageRefs.push(imageDoc.id);
        index++;
      }
    }

    console.log('🖼️ Toplam resim sayısı:', imageRefs.length);

    // Video dosyasını ayrı koleksiyonda sakla (eğer varsa)
    let videoRef = null;
    if (formData) {
      const videoFile = formData.get('videoFile') as File;
      if (videoFile) {
        const arrayBuffer = await videoFile.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        // Base64'ü parçalara böl
        const videoChunks = chunkBase64(base64);
        console.log(`🎥 Video: ${videoChunks.length} parçaya bölündü`);
        
        // Ana video meta bilgisini sakla
        const videoDoc = await adminDb.collection('queue_videos').add({
          type: videoFile.type,
          filename: videoFile.name,
          size: videoFile.size,
          chunks_count: videoChunks.length,
          created_at: new Date()
        });
        
        // Her parçayı ayrı dokümanda sakla
        const videoChunkPromises = videoChunks.map(async (chunk, chunkIndex) => {
          return adminDb.collection('queue_video_chunks').add({
            video_id: videoDoc.id,
            chunk_index: chunkIndex,
            chunk_data: chunk,
            created_at: new Date()
          });
        });
        
        await Promise.all(videoChunkPromises);
        videoRef = videoDoc.id;
        console.log('🎥 Video dosyası:', videoFile.name, (videoFile.size / 1024 / 1024).toFixed(2), 'MB');
      }
    }

    // Description'dan base64 data'yı temizle
    const cleanDescription = typeof listingData.description === 'string' 
      ? listingData.description.replace(/data:image\/[^;]+;base64,[\w+/=]+/g, '[IMAGE_REMOVED]')
      : '';

    console.log('🧹 Description temizlendi:', {
      original_length: listingData.description?.length || 0,
      cleaned_length: cleanDescription.length,
      contains_base64: listingData.description?.includes('base64') || false
    });

    // Variations'daki base64 data'yı da temizle
    let cleanVariations = [];
    if (listingData.variations && Array.isArray(listingData.variations)) {
      cleanVariations = listingData.variations.map((variation: any) => {
        const cleanVar = { ...variation };
        // Variation içindeki herhangi bir string alanından base64 temizle
        Object.keys(cleanVar).forEach(key => {
          if (typeof cleanVar[key] === 'string') {
            cleanVar[key] = cleanVar[key].replace(/data:image\/[^;]+;base64,[\w+/=]+/g, '[IMAGE_REMOVED]');
            cleanVar[key] = cleanVar[key].replace(/[A-Za-z0-9+/]{100,}={0,2}/g, '[LONG_STRING_REMOVED]');
          }
        });
        return cleanVar;
      });
    }

    const variationsJson = JSON.stringify(cleanVariations);
    console.log('🧹 Variations temizlendi:', {
      original_count: listingData.variations?.length || 0,
      cleaned_count: cleanVariations.length,
      json_length: variationsJson.length
    });

    // Kuyruk öğesi oluştur - Base64 data olmadan
    const queueItem = {
      user_id: userId,
      title: listingData.title,
      description: cleanDescription,
      price: listingData.price || 0,
      tags: listingData.tags || [],
      taxonomy_id: listingData.taxonomy_id || 1027,
      shop_section_id: listingData.shop_section_id,
      has_variations: listingData.has_variations || false,
      variations_count: cleanVariations.length,
      variations_json: variationsJson,
      images_count: imageRefs.length,
      image_refs: imageRefs, // Sadece ID referansları
      video_ref: videoRef, // Sadece ID referansı
      // Personalization fields
      is_personalizable: listingData.is_personalizable || false,
      personalization_is_required: listingData.personalization_is_required || false,
      personalization_char_count_max: listingData.personalization_char_count_max || 0,
      personalization_instructions: listingData.personalization_instructions || '',
      // Other Etsy fields
      who_made: listingData.who_made || 'i_did',
      when_made: listingData.when_made || 'made_to_order',
      shipping_profile_id: listingData.shipping_profile_id,
      is_supply: listingData.is_supply || false,
      renewal_option: listingData.renewal_option || 'automatic',
      // product_data_json kaldırıldı - gereksiz ve büyük
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
      retry_count: 0,
    };

    // Debug: Kaydedilen verileri logla
    console.log('🔍 Kuyruğa kaydedilen veriler:', {
      shop_section_id: queueItem.shop_section_id,
      is_personalizable: queueItem.is_personalizable,
      personalization_is_required: queueItem.personalization_is_required,
      personalization_instructions: queueItem.personalization_instructions,
      personalization_char_count_max: queueItem.personalization_char_count_max
    });

    // Firebase'e kaydet - Flattened structure
    const docRef = await adminDb.collection('queue').add(queueItem);
    
    console.log('✅ Kuyruk öğesi oluşturuldu:', docRef.id);

    return NextResponse.json({
      success: true,
      queue_id: docRef.id,
      message: 'Ürün kuyruğa başarıyla eklendi',
      status: 'pending'
    });

  } catch (error) {
    console.error('❌ Kuyruk API hatası:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Kuyruk işlemi başarısız',
      success: false
    }, { status: 500 });
  }
}