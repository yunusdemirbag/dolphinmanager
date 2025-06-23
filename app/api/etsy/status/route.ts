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
            const apiKeyRef = adminDb.collection('etsy_api_keys').doc(shopId);
            const apiKeyDoc = await apiKeyRef.get();
            
            if (apiKeyDoc.exists) {
              const apiKeyData = apiKeyDoc.data();
              apiKey = apiKeyData?.api_key;
              accessToken = apiKeyData?.access_token;
            }
          }
        }
      } catch (error) {
        console.error('Firebase\'den API bilgileri alınamadı:', error);
      }
    }

    // Etsy API'ye istek gönder
    if (!apiKey || !accessToken || !shopId) {
      return NextResponse.json({ 
        error: 'Etsy API kimlik bilgileri bulunamadı',
        isConnected: false,
        shopId: null,
        shopName: null
      }, { status: 401 });
    }

    // Etsy API'ye istek gönder - user_id'yi integer olarak gönder
    const shopIdInt = parseInt(shopId, 10);
    if (isNaN(shopIdInt)) {
      return NextResponse.json({ 
        error: 'Geçersiz mağaza ID formatı',
        isConnected: false,
        shopId: null,
        shopName: null
      }, { status: 400 });
    }

    const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopIdInt}`, {
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Etsy API hatası: ${response.status}`,
        isConnected: false,
        shopId: shopId,
        shopName: null
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      isConnected: true,
      shopId: data.shop_id,
      shopName: data.shop_name
    });
  } catch (error: any) {
    console.error('Etsy bağlantı durumu kontrolü sırasında hata:', error);
    return NextResponse.json({ 
      error: `Etsy bağlantı durumu kontrolü başarısız: ${error.message}`,
      isConnected: false,
      shopId: null,
      shopName: null
    }, { status: 500 });
  }
}