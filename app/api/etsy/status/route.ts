import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    // Test user ID - gerçek implementasyonda session'dan gelecek
    const testUserId = '1007541496';
    
    if (adminDb) {
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
          return NextResponse.json({
            connected: true,
            shop_name: shop.shop_name,
            shop_id: shop.shop_id.toString(),
            user_id: testUserId
          });
        }
      }
    } catch (etsyError) {
      console.error('Etsy API error:', etsyError);
    }
    
    // Bağlantı yok
    return NextResponse.json({
      connected: false
    });
    
  } catch (error) {
    console.error('Etsy status kontrol hatası:', error);
    return NextResponse.json({ 
      connected: false, 
      error: 'Status check failed' 
    });
  }
}