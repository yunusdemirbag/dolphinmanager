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
    
    // Kullanıcının tüm aktif mağazalarını bul (orderBy çıkarıldı - index gereksinimi için)
    const storesSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .where('is_active', '==', true)
      .get();

    let stores = storesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Client-side sorting by connected_at (desc)
    stores = stores.sort((a: any, b: any) => {
      const aTime = a.connected_at?.toDate?.() || new Date(a.connected_at);
      const bTime = b.connected_at?.toDate?.() || new Date(b.connected_at);
      return bTime.getTime() - aTime.getTime();
    });
    
    console.log('📋 Bulunan mağaza sayısı:', stores.length);
    
    return NextResponse.json({
      success: true,
      stores: stores,
      activeStoreId: stores.length > 0 ? stores[0].shop_id : null
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