import { NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase admin not initialized' }, { status: 500 });
    }

    const { shop_id, user_id, userId } = await request.json();
    const finalUserId = userId || user_id || 'local-user-123';

    if (!finalUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`Kullanıcı ${finalUserId} için tüm Etsy bağlantıları kesiliyor...`);

    // Kullanıcının bağlı mağazalarını bul
    const storesSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', finalUserId)
      .where('is_active', '==', true)
      .get();

    if (storesSnapshot.empty) {
      return NextResponse.json({ 
        success: true,
        message: 'Zaten bağlı mağaza yok' 
      });
    }

    // Batch işlem ile tüm mağaza bağlantılarını kaldır
    const batch = adminDb.batch();
    let deletedStores = 0;
    let deletedApiKeys = 0;

    for (const storeDoc of storesSnapshot.docs) {
      const shopIdStr = storeDoc.id;
      const storeData = storeDoc.data();
      
      console.log(`Mağaza bağlantısı kesiliyor: ${storeData.shop_name} (ID: ${shopIdStr})`);
      
      // Store'u pasif yap
      batch.update(storeDoc.ref, {
        is_active: false,
        disconnected_at: new Date(),
        disconnected_by: finalUserId
      });
      deletedStores++;
      
      // API anahtarlarını sil
      const apiKeyRef = adminDb.collection('etsy_api_keys').doc(shopIdStr);
      const apiKeyDoc = await apiKeyRef.get();
      if (apiKeyDoc.exists) {
        batch.delete(apiKeyRef);
        deletedApiKeys++;
      }
    }

    // Batch'i çalıştır
    await batch.commit();

    console.log(`✅ ${deletedStores} mağaza bağlantısı kesildi, ${deletedApiKeys} API anahtarı temizlendi`);
    
    return NextResponse.json({ 
      success: true,
      message: `${deletedStores} mağaza bağlantısı başarıyla kesildi`,
      deleted_stores: deletedStores,
      deleted_api_keys: deletedApiKeys
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Error disconnecting store:', error);
    return NextResponse.json({ 
      success: false,
      error: `Mağaza bağlantısı kesilemedi: ${errorMessage}` 
    }, { status: 500 });
  }
} 