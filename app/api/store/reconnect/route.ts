import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    const body = await request.json();
    const { shopId, userId, makeActive = true } = body;
    
    if (!shopId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'shopId ve userId gerekli'
      }, { status: 400 });
    }

    console.log('🔌 Mağaza yeniden bağlanıyor:', { shopId, userId, makeActive });

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

    // API anahtarlarının hala geçerli olduğunu kontrol et
    const apiKeysDoc = await adminDb
      .collection('etsy_api_keys')
      .doc(shopId)
      .get();

    if (!apiKeysDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'API anahtarları bulunamadı - yeniden OAuth gerekli',
        requiresOAuth: true
      }, { status: 400 });
    }

    const apiKeys = apiKeysDoc.data();
    const expiresAt = apiKeys?.expires_at?.toDate?.() || new Date(apiKeys?.expires_at);
    
    if (expiresAt && expiresAt < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'API anahtarları süresi dolmuş - yeniden OAuth gerekli',
        requiresOAuth: true,
        expiresAt: expiresAt.toISOString()
      }, { status: 400 });
    }

    const batch = adminDb.batch();

    // Eğer aktif yapılacaksa, diğer mağazaları pasif yap
    if (makeActive) {
      const activeStoresSnapshot = await adminDb
        .collection('etsy_stores')
        .where('user_id', '==', userId)
        .where('is_active', '==', true)
        .get();

      activeStoresSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { is_active: false });
      });
    }

    // Mağazayı yeniden bağla
    batch.update(storeDoc.ref, {
      is_connected: true,
      is_active: makeActive,
      reconnected_at: new Date(),
      last_activated_at: makeActive ? new Date() : storeData.last_activated_at,
      last_updated: new Date(),
      // Disconnect bilgilerini temizle
      disconnected_at: null,
      disconnect_reason: null
    });

    await batch.commit();

    // Analytics'i güncelle
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/store/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId })
      });
    } catch (error) {
      console.warn('Analytics güncellenemedi:', error);
    }

    console.log('✅ Mağaza başarıyla yeniden bağlandı');

    return NextResponse.json({
      success: true,
      message: 'Mağaza başarıyla yeniden bağlandı',
      store: {
        id: shopId,
        shop_name: storeData.shop_name,
        is_connected: true,
        is_active: makeActive
      }
    });

  } catch (error) {
    console.error('❌ Mağaza yeniden bağlama hatası:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Mağaza yeniden bağlanamadı',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}