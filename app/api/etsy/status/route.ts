import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    let apiKey = process.env.ETSY_API_KEY;
    let accessToken = process.env.ETSY_ACCESS_TOKEN;
    let shopId = null;
    
    // Firebase bağlantısı varsa, oradan API bilgilerini çek
    if (adminDb) {
      try {
        // En son bağlanan mağaza bilgilerini al
        const storesRef = adminDb.collection('etsy_stores');
        const storeSnapshot = await storesRef.orderBy('connected_at', 'desc').limit(1).get();
        
        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data();
          shopId = storeData?.shop_id?.toString();
          
          // Mağaza ID'sine göre API anahtarlarını al
          if (shopId) {
            const apiKeysRef = adminDb.collection('etsy_api_keys').doc(shopId);
            const apiSnapshot = await apiKeysRef.get();
            
            if (apiSnapshot.exists) {
              const apiData = apiSnapshot.data();
              apiKey = apiData?.api_key || apiKey;
              accessToken = apiData?.access_token || accessToken;
            }
          }
        }
      } catch (dbError) {
        console.error('Firebase API bilgileri okuma hatası:', dbError);
      }
    }

    if (!apiKey || !accessToken) {
      console.error('Etsy API kimlik bilgileri bulunamadı.');
      return NextResponse.json({ 
        connected: false,
        error: 'Etsy API kimlik bilgileri bulunamadı. Lütfen Etsy mağazanızı bağlayın.'
      }, { status: 500 });
    }
    
    // Etsy API'den mağaza bilgilerini çek
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
          
          // Mağaza bilgilerini Firebase'e kaydet
          if (adminDb) {
            try {
              const shopIdStr = shop.shop_id.toString();
              await adminDb.collection('etsy_stores').doc(shopIdStr).set({
                shop_id: shop.shop_id,
                shop_name: shop.shop_name,
                connected_at: new Date(),
                last_sync_at: new Date(),
                is_active: true
              });
              
              // API bilgilerini de kaydet
              await adminDb.collection('etsy_api_keys').doc(shopIdStr).set({
                api_key: apiKey,
                access_token: accessToken,
                updated_at: new Date()
              });
            } catch (saveError) {
              console.error('Mağaza bilgilerini Firebase\'e kaydetme hatası:', saveError);
            }
          }
          
          return NextResponse.json({
            connected: true,
            shop_name: shop.shop_name,
            shop_id: shop.shop_id.toString()
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