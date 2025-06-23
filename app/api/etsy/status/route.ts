import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  const apiKey = process.env.ETSY_API_KEY;
  const accessToken = process.env.ETSY_ACCESS_TOKEN;

  if (!apiKey || !accessToken) {
    console.error('Missing Etsy API credentials in environment variables.');
    return NextResponse.json({ 
      connected: false,
      error: 'Eksik API kimlik bilgileri. Lütfen Vercel ortam değişkenlerini kontrol edin.'
    }, { status: 500 });
  }

  try {
    const testUserId = '1007541496';
    
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
      }
    }
    
    try {
      const response = await fetch('https://openapi.etsy.com/v3/application/users/me/shops', {
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.count > 0 && data.results && data.results[0]) {
          const shop = data.results[0];
          
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
        const errorBody = await response.text();
        console.error('Etsy API hatası (status):', errorBody);
        return NextResponse.json({ 
          connected: false, 
          error: `Etsy API error: ${response.status}`
        }, { status: response.status });
      }
    } catch (etsyError) {
      console.error('Etsy API bağlantı hatası:', etsyError);
      return NextResponse.json({ 
        connected: false, 
        error: 'Etsy API connection failed'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      connected: false,
      error: 'No shop data found'
    }, { status: 404 });
    
  } catch (error) {
    console.error('Etsy status kontrol hatası:', error);
    return NextResponse.json({ 
      connected: false, 
      error: 'Status check failed' 
    }, { status: 500 });
  }
}