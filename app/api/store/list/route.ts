import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Firebase admin'i başlat
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    // Kullanıcı ID'sini al (şimdilik mock)
    const userId = process.env.MOCK_USER_ID || 'local-user-123';
    
    console.log('🔍 Kullanıcının tüm mağazaları getiriliyor:', userId);
    
    // Kullanıcının tüm bağlı mağazalarını bul (is_active filtresi kaldırıldı)
    const storesSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .get();

    let stores = await Promise.all(storesSnapshot.docs.map(async (doc) => {
      const storeData = doc.data();
      
      // API anahtarlarını kontrol et
      const apiKeysDoc = await adminDb!
        .collection('etsy_api_keys')
        .doc(doc.id)
        .get();
        
      return {
        id: doc.id,
        ...storeData,
        hasValidToken: apiKeysDoc.exists
      };
    }));
    
    // Bağlantısı kesilmiş mağazaları filtrele (includeDisconnected parametresi kontrol et)
    const { searchParams } = new URL(request.url);
    const includeDisconnected = searchParams.get('includeDisconnected') === 'true';
    
    if (!includeDisconnected) {
      stores = stores.filter((store: any) => {
        // Sadece açıkça false olan veya disconnected_at tarihi olan mağazaları filtrele
        const isConnected = store.is_connected !== false && !store.disconnected_at;
        return isConnected;
      });
    }
    
    // Client-side sorting by connected_at (desc)
    stores = stores.sort((a: any, b: any) => {
      const aTime = a.connected_at?.toDate?.() || new Date(a.connected_at);
      const bTime = b.connected_at?.toDate?.() || new Date(b.connected_at);
      return bTime.getTime() - aTime.getTime();
    });
    
    console.log('📋 Bulunan mağaza sayısı:', stores.length);
    
    // Aktif mağazayı bul
    const activeStore = stores.find((store: any) => store.is_active === true);
    
    return NextResponse.json({
      success: true,
      stores: stores,
      activeStoreId: activeStore ? activeStore.shop_id : (stores.length > 0 ? stores[0].shop_id : null)
    });
    
  } catch (error) {
    console.error('❌ Mağaza listesi getirme hatası:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Mağaza listesi alınamadı',
      stores: []
    }, { status: 500 });
  }
}