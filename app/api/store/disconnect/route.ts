import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    const body = await request.json();
    const { shopId, userId, reason = 'user_request' } = body;
    
    if (!shopId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'shopId ve userId gerekli'
      }, { status: 400 });
    }

    console.log('🔌 Mağaza bağlantısı kesiliyor:', { shopId, userId, reason });

    // Mağazanın kullanıcıya ait olduğunu kontrol et
    const storeDoc = await adminDb
      .collection('etsy_stores')
      .doc(shopId)
      .get();

    if (!storeDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Mağaza bulunamadı'
      }, { status: 404 });
    }

    const storeData = storeDoc.data();
    if (storeData?.user_id !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Bu mağaza üzerinde yetkiniz yok'
      }, { status: 403 });
    }

    // Soft delete - Mağazayı disconnected olarak işaretle
    await adminDb
      .collection('etsy_stores')
      .doc(shopId)
      .update({
        is_connected: false,
        is_active: false,
        disconnected_at: new Date(),
        disconnect_reason: reason,
        last_updated: new Date()
      });

    // Diğer aktif mağaza var mı kontrol et
    const activeStoresSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .where('is_connected', '==', true)
      .where('is_active', '==', true)
      .get();

    let newActiveStore = null;
    if (!activeStoresSnapshot.empty) {
      // İlk aktif mağazayı yeni aktif mağaza yap
      const firstActiveStore = activeStoresSnapshot.docs[0];
      await firstActiveStore.ref.update({
        is_active: true,
        last_activated_at: new Date()
      });
      newActiveStore = {
        id: firstActiveStore.id,
        ...firstActiveStore.data()
      };
    }

    console.log('✅ Mağaza başarıyla kaldırıldı');

    return NextResponse.json({
      success: true,
      message: 'Mağaza başarıyla kaldırıldı',
      disconnectedStore: {
        id: shopId,
        shop_name: storeData.shop_name
      },
      newActiveStore
    });

  } catch (error) {
    console.error('❌ Mağaza kaldırma hatası:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Mağaza kaldırılamadı',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Kaldırılan mağazaları listele
export async function GET(request: NextRequest) {
  try {
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || process.env.MOCK_USER_ID || 'local-user-123';

    console.log('📋 Kaldırılan mağazalar getiriliyor:', userId);

    const disconnectedStoresSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .where('is_connected', '==', false)
      .orderBy('disconnected_at', 'desc')
      .get();

    const disconnectedStores = disconnectedStoresSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      disconnected_at: doc.data().disconnected_at?.toDate?.() || doc.data().disconnected_at
    }));

    return NextResponse.json({
      success: true,
      disconnectedStores,
      count: disconnectedStores.length
    });

  } catch (error) {
    console.error('❌ Kaldırılan mağazaları getirme hatası:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Kaldırılan mağazalar getirilemedi'
    }, { status: 500 });
  }
}