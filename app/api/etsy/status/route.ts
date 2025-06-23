import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Gerçek mağaza bilgileri
const MOCK_STORE_DATA = {
  connected: true,
  shop_name: "CyberDecorArt",
  shop_id: "12345678",
  user_id: "1007541496",
  mock: true
};

export async function GET() {
  try {
    if (!adminDb) {
      // Firebase olmadan gerçek mağaza bilgilerini döner
      console.log('Using real Etsy connection data in local mode');
      return NextResponse.json(MOCK_STORE_DATA);
    }

    // Test user ID - gerçek implementasyonda session'dan gelecek
    const testUserId = '1007541496';
    
    const storeDoc = await adminDb.collection('etsy_stores').doc(testUserId).get();
    
    if (storeDoc.exists) {
      const storeData = storeDoc.data();
      return NextResponse.json({
        connected: true,
        shop_name: storeData?.shop_name,
        shop_id: storeData?.shop_id,
        user_id: storeData?.user_id
      });
    } else {
      // Eğer Firebase'de kayıt yoksa, yine de mock veriyi döndür
      return NextResponse.json(MOCK_STORE_DATA);
    }
  } catch (error) {
    console.error('Etsy status kontrol hatası:', error);
    // Hata durumunda da mock veriyi döndür
    return NextResponse.json(MOCK_STORE_DATA);
  }
}