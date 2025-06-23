import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    let shopId = process.env.ETSY_SHOP_ID;
    let apiKey = process.env.ETSY_API_KEY;
    let accessToken = process.env.ETSY_ACCESS_TOKEN;
    
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
        products: []
      }, { status: 401 });
    }
    
    // Shop ID'yi integer'a dönüştür
    const shopIdInt = parseInt(shopId, 10);
    if (isNaN(shopIdInt)) {
      return NextResponse.json({ 
        error: 'Geçersiz mağaza ID formatı',
        products: []
      }, { status: 400 });
    }

    try {
      const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopIdInt}/listings/active`, {
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Etsy API error: ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json({ products: data.results || [] });
    } catch (error: any) {
      console.error('Error fetching products from Etsy API:', error);
      return NextResponse.json({ 
        error: `Etsy API'den ürünler alınamadı: ${error.message}`,
        products: []
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Ürün listesi alınırken hata oluştu:', error);
    return NextResponse.json({ 
      error: `Ürün listesi alınamadı: ${error.message}`,
      products: []
    }, { status: 500 });
  }
} 