import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    // Firebase'den API bilgilerini al
    let shopId = null;
    let shopName = null;
    let apiKey = process.env.ETSY_API_KEY;
    let accessToken = process.env.ETSY_ACCESS_TOKEN;
    let isConnected = false;

    if (adminDb) {
      try {
        // En son bağlanan mağaza bilgilerini al
        const storesRef = adminDb.collection('etsy_stores');
        const storeSnapshot = await storesRef.orderBy('connected_at', 'desc').limit(1).get();
        
        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data();
          shopId = storeData?.shop_id?.toString();
          shopName = storeData?.shop_name;
          
          // Mağaza ID'sine göre API anahtarlarını al
          if (shopId) {
            const apiKeyRef = adminDb.collection('etsy_api_keys').doc(shopId);
            const apiKeyDoc = await apiKeyRef.get();
            
            if (apiKeyDoc.exists) {
              const apiKeyData = apiKeyDoc.data();
              apiKey = apiKeyData?.api_key;
              accessToken = apiKeyData?.access_token;
              isConnected = true;
            }
          }
        }
      } catch (error) {
        console.error('Firebase\'den API bilgileri alınamadı:', error);
      }
    }

    // API bilgileri tam değilse, bağlantı yok demektir
    if (!apiKey || !accessToken || !shopId) {
      return NextResponse.json({
        isConnected: false,
        shopId: null,
        shopName: null,
        error: 'Etsy bağlantısı bulunamadı'
      });
    }

    // Shop ID'yi integer'a dönüştür
    const shopIdInt = parseInt(shopId, 10);
    if (isNaN(shopIdInt)) {
      return NextResponse.json({
        isConnected: false,
        shopId: null,
        shopName: null,
        error: 'Geçersiz mağaza ID formatı'
      });
    }

    // Etsy API'ye bağlantıyı test et
    try {
      const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopIdInt}`, {
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        console.error('Etsy API bağlantı hatası:', response.status);
        return NextResponse.json({
          isConnected: false,
          shopId: shopId,
          shopName: shopName,
          error: `Etsy API hatası: ${response.status}`
        });
      }

      const data = await response.json();
      
      // Başarılı bağlantı
      return NextResponse.json({
        isConnected: true,
        shopId: data.shop_id.toString(),
        shopName: data.shop_name,
        shopData: data
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      console.error('Etsy API bağlantı kontrolü sırasında hata:', error);
      
      return NextResponse.json({
        isConnected: false,
        shopId: shopId,
        shopName: shopName,
        error: `Etsy API bağlantı hatası: ${errorMessage}`
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Etsy bağlantı durumu kontrol edilirken hata oluştu:', error);
    
    return NextResponse.json({
      isConnected: false,
      shopId: null,
      shopName: null,
      error: `Bağlantı durumu kontrol edilemedi: ${errorMessage}`
    });
  }
}