import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Kuyruk API çağrısı başlatıldı');
    
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
      return NextResponse.json({ error: 'Invalid listing data format' }, { status: 400 });
    }

    // Firebase Admin'i initialize et
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const userId = 'local-user-123'; // Bu gerçek auth context'den gelecek

    // Görselleri ayrı koleksiyonda sakla - Firebase limit için
    const imageRefs: string[] = [];
    let index = 0;
    while (true) {
      const imageFile = formData.get(`imageFile_${index}`) as File;
      if (!imageFile) break;
      
      // File'ı base64'e çevir
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      // Resmi ayrı koleksiyonda sakla
      const imageDoc = await adminDb.collection('queue_images').add({
        base64: base64,
        type: imageFile.type,
        filename: imageFile.name,
        position: index,
        size: imageFile.size,
        created_at: new Date()
      });
      
      imageRefs.push(imageDoc.id);
      index++;
    }

    console.log('🖼️ Toplam resim sayısı:', imageRefs.length);

    // Video dosyasını ayrı koleksiyonda sakla (eğer varsa)
    let videoRef = null;
    const videoFile = formData.get('videoFile') as File;
    if (videoFile) {
      const arrayBuffer = await videoFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      // Video'yu ayrı koleksiyonda sakla
      const videoDoc = await adminDb.collection('queue_videos').add({
        base64: base64,
        type: videoFile.type,
        filename: videoFile.name,
        size: videoFile.size,
        created_at: new Date()
      });
      
      videoRef = videoDoc.id;
      console.log('🎥 Video dosyası:', videoFile.name, (videoFile.size / 1024 / 1024).toFixed(2), 'MB');
    }

    // Kuyruk öğesi oluştur - Referanslarla, büyük veri yok
    const queueItem = {
      user_id: userId,
      title: listingData.title,
      description: listingData.description || '',
      price: listingData.price || 0,
      tags: listingData.tags || [],
      taxonomy_id: listingData.taxonomy_id || 1027,
      has_variations: listingData.has_variations || false,
      variations_count: listingData.variations?.length || 0,
      variations_json: JSON.stringify(listingData.variations || []),
      images_count: imageRefs.length,
      image_refs: imageRefs, // Sadece ID referansları
      video_ref: videoRef, // Sadece ID referansı
      product_data_json: JSON.stringify(listingData),
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
      retry_count: 0,
    };

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