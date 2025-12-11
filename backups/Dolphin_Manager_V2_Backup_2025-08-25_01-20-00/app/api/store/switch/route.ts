import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Firebase admin'i başlat
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    const body = await request.json();
    const { shopId, userId } = body;
    
    if (!shopId) {
      return NextResponse.json({
        success: false,
        error: 'Mağaza ID\'si gerekli'
      }, { status: 400 });
    }
    
    console.log('🔄 Mağaza geçişi yapılıyor:', shopId);
    
    const targetUserId = userId || process.env.MOCK_USER_ID || 'local-user-123';
    
    // Bu kullanıcının bu mağazaya erişimi var mı kontrol et
    const storesSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', targetUserId)
      .where('shop_id', '==', parseInt(shopId))
      .where('is_active', '==', true)
      .get();
    
    if (storesSnapshot.empty) {
      return NextResponse.json({
        success: false,
        error: 'Bu mağazaya erişim yetkiniz yok veya mağaza bulunamadı'
      }, { status: 403 });
    }

    const storeDoc = storesSnapshot.docs[0];
    const store = {
      id: storeDoc.id,
      ...storeDoc.data()
    };
    
    console.log('✅ Mağaza geçişi başarılı:', store.shop_name);
    
    return NextResponse.json({
      success: true,
      store: store,
      message: `${store.shop_name} mağazasına geçildi`
    });
    
  } catch (error) {
    console.error('❌ Mağaza geçiş hatası:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Mağaza geçişi yapılamadı'
    }, { status: 500 });
  }
}