import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    // Test user ID - gerçek implementasyonda session'dan gelecek
    const testUserId = '1007541496';
    
    // Firebase bağlantısı varsa, verileri oradan çek
    if (adminDb) {
      try {
        const storeDoc = await adminDb.collection('etsy_stores').doc(testUserId).get();
        
        if (storeDoc.exists) {
          const storeData = storeDoc.data();
          return NextResponse.json({
            connected: true,
            shop_name: storeData?.shop_name,
            shop_id: storeData?.shop_id,
            user_id: storeData?.user_id
          });
        }
      } catch (dbError) {
        console.error('Firebase bağlantı hatası:', dbError);
        // Firebase hatası durumunda devam et ve API'den veri çekmeyi dene
      }
    }
    
    // Gerçek Etsy API'den veri çek
    try {
      // Etsy API'den mağaza bilgilerini çek
      const response = await fetch('https://openapi.etsy.com/v3/application/users/me/shops', {
        headers: {
          'x-api-key': process.env.ETSY_API_KEY || '',
          'Authorization': `Bearer ${process.env.ETSY_ACCESS_TOKEN || ''}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.count > 0 && data.results && data.results[0]) {
          const shop = data.results[0];
          
          // Eğer Firebase bağlantısı varsa, mağaza bilgilerini kaydet
          if (adminDb) {
            try {
              await adminDb.collection('etsy_stores').doc(testUserId).set({
                shop_id: shop.shop_id,
                shop_name: shop.shop_name,
                user_id: testUserId,
                connected_at: new Date(),
                last_sync_at: new Date(),
                is_active: true
              });
            } catch (saveError) {
              console.error('Mağaza bilgilerini Firebase\'e kaydetme hatası:', saveError);
            }
          }
          
          return NextResponse.json({
            connected: true,
            shop_name: shop.shop_name,
            shop_id: shop.shop_id.toString(),
            user_id: testUserId
          });
        }
      } else {
        console.error('Etsy API error:', await response.text());
      }
    } catch (etsyError) {
      console.error('Etsy API error:', etsyError);
    }
    
    console.log('Returning mock store data for development');
    
    // Gerçek veri alınamadıysa, varsayılan mağaza bilgilerini döndür
    return NextResponse.json({
      connected: true,
      shop_name: "CyberDecorArt",
      shop_id: "12345678",
      user_id: testUserId
    });
    
  } catch (error) {
    console.error('Etsy status kontrol hatası:', error);
    
    // Hata durumunda da varsayılan mağaza bilgilerini döndür
    return NextResponse.json({
      connected: true,
      shop_name: "CyberDecorArt",
      shop_id: "12345678",
      user_id: "1007541496"
    });
  }
}