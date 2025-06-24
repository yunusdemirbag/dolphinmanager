import { NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase admin not initialized' }, { status: 500 });
    }

    const { shop_id, user_id } = await request.json();

    if (!shop_id) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`Mağaza bağlantısı kesiliyor: ${shop_id} (Kullanıcı: ${user_id})`);

    // Shop ID'yi string olarak kullan (callback'te nasıl kaydedildiyse)
    const shopIdStr = shop_id.toString();

    // Doğru Firebase koleksiyonlarını güncelle
    const storeRef = adminDb.collection('etsy_stores').doc(shopIdStr);
    const apiKeysRef = adminDb.collection('etsy_api_keys').doc(shopIdStr);

    // Mağaza durumunu pasif yap
    await storeRef.update({
      is_active: false,
      disconnected_at: new Date(),
      disconnected_by: user_id
    });

    // API anahtarlarını sil (güvenlik için)
    await apiKeysRef.delete();

    console.log(`Mağaza ${shop_id} bağlantısı başarıyla kesildi ve token'lar temizlendi.`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Mağaza bağlantısı başarıyla kesildi' 
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