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

    // Görselleri base64'e çevir ve sakla
    const imageFiles: any[] = [];
    let index = 0;
    while (true) {
      const imageFile = formData.get(`imageFile_${index}`) as File;
      if (!imageFile) break;
      
      // File'ı base64'e çevir
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      imageFiles.push({
        base64: base64,
        type: imageFile.type,
        filename: imageFile.name,
        position: index,
        size: imageFile.size
      });
      
      index++;
    }

    console.log('🖼️ Toplam resim sayısı:', imageFiles.length);

    // Video dosyasını işle (eğer varsa)
    let videoData = null;
    const videoFile = formData.get('videoFile') as File;
    if (videoFile) {
      const arrayBuffer = await videoFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      videoData = {
        base64: base64,
        type: videoFile.type,
        filename: videoFile.name,
        size: videoFile.size
      };
      
      console.log('🎥 Video dosyası:', videoFile.name, (videoFile.size / 1024 / 1024).toFixed(2), 'MB');
    }

    // Kuyruk öğesi oluştur
    const queueItem = {
      user_id: userId,
      product_data: {
        ...listingData,
        images: imageFiles,
        video: videoData,
        created_at: new Date().toISOString()
      },
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
      retry_count: 0,
    };

    // Firebase'e kaydet
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