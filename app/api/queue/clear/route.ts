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

    console.log(`🗑️ HIZLI TEMİZLEME - kullanıcı: ${userId}`);

    // TÜM QUEUE COLLECTION'INI SİL (HIZLI)
    const queueSnapshot = await adminDb.collection('queue').get();

    if (queueSnapshot.empty) {
      return NextResponse.json({ 
        success: true,
        message: 'Kuyruk zaten boş',
        deleted_count: 0
      });
    }

    console.log(`📋 ${queueSnapshot.docs.length} queue item bulundu, hızla siliniyor...`);

    // Basit batch silme - sadece queue collection
    const batch = adminDb.batch();
    let deletedCount = 0;
    
    // İlk 500 item'i sil (Firestore batch limit)
    queueSnapshot.docs.slice(0, 500).forEach(doc => {
      const queueData = doc.data();
      if (queueData.user_id === userId) {
        batch.delete(doc.ref);
        deletedCount++;
      }
    });

    // Batch işlemini çalıştır
    await batch.commit();

    console.log(`✅ Hızlı temizleme tamamlandı - ${deletedCount} öğe silindi`);

    return NextResponse.json({
      success: true,
      message: `${deletedCount} öğe başarıyla silindi`,
      deleted_count: deletedCount,
      total_found: queueSnapshot.docs.length
    });

  } catch (error) {
    console.error('❌ Kuyruk temizleme hatası:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Kuyruk temizlenemedi',
      success: false
    }, { status: 500 });
  }
}