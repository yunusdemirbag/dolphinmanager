import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Firebase bağlantısını başlat
    initializeAdminApp();
    
    if (!adminDb) {
      console.error('Firebase Admin not initialized');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    console.log(`🗑️ Kuyruk temizleniyor - kullanıcı: ${userId}`);

    // Kullanıcının tüm kuyruk öğelerini al
    const queueSnapshot = await adminDb
      .collection('queue')
      .where('user_id', '==', userId)
      .get();

    if (queueSnapshot.empty) {
      return NextResponse.json({ 
        success: true,
        message: 'Kuyruk zaten boş',
        deleted_count: 0
      });
    }

    const batch = adminDb.batch();
    const deletedItems = [];

    // Her kuyruk öğesi için
    for (const doc of queueSnapshot.docs) {
      const queueData = doc.data();
      deletedItems.push({
        id: doc.id,
        title: queueData.title,
        status: queueData.status
      });

      // Ana kuyruk öğesini sil
      batch.delete(doc.ref);

      // İlişkili resimleri sil
      if (queueData.image_refs && queueData.image_refs.length > 0) {
        for (const imageId of queueData.image_refs) {
          // Resim belgesini sil
          const imageRef = adminDb.collection('queue_images').doc(imageId);
          batch.delete(imageRef);

          // Resim parçalarını sil
          const chunksSnapshot = await adminDb
            .collection('queue_image_chunks')
            .where('image_id', '==', imageId)
            .get();
          
          chunksSnapshot.docs.forEach(chunkDoc => {
            batch.delete(chunkDoc.ref);
          });
        }
      }

      // İlişkili videoyu sil
      if (queueData.video_ref) {
        // Video belgesini sil
        const videoRef = adminDb.collection('queue_videos').doc(queueData.video_ref);
        batch.delete(videoRef);

        // Video parçalarını sil
        const videoChunksSnapshot = await adminDb
          .collection('queue_video_chunks')
          .where('video_id', '==', queueData.video_ref)
          .get();
        
        videoChunksSnapshot.docs.forEach(chunkDoc => {
          batch.delete(chunkDoc.ref);
        });
      }
    }

    // Batch işlemini çalıştır
    await batch.commit();

    console.log(`✅ Kuyruk temizlendi - ${deletedItems.length} öğe silindi`);
    console.log('🗑️ Silinen öğeler:', deletedItems.map(item => `${item.title} (${item.status})`));

    return NextResponse.json({
      success: true,
      message: `${deletedItems.length} öğe başarıyla silindi`,
      deleted_count: deletedItems.length,
      deleted_items: deletedItems
    });

  } catch (error) {
    console.error('❌ Kuyruk temizleme hatası:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Kuyruk temizlenemedi',
      success: false
    }, { status: 500 });
  }
}