import { NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function GET() {
  try {
    // Firebase'i başlat
    initializeAdminApp();
    
    // Firebase'den API bilgilerini al
    let shopId = null;
    let shopName = null;
    let apiKey = process.env.ETSY_API_KEY || '';
    let accessToken = process.env.ETSY_ACCESS_TOKEN;
    let isConnected = false;
    
    // Kullanıcı kimliği - gerçek ortamda session'dan gelecek
    const userId = process.env.MOCK_USER_ID || 'local-user-123';

    if (adminDb) {
      try {
        console.log(`Firebase bağlantısı mevcut, kullanıcı ${userId} için mağaza bilgileri alınıyor...`);
        
        // Kullanıcı ID'sine göre mağaza bilgilerini al
        const storesRef = adminDb.collection('etsy_stores').where('user_id', '==', userId).where('is_active', '==', true);
        const storeSnapshot = await storesRef.limit(1).get();
        
        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data();
          shopId = storeData?.shop_id?.toString();
          shopName = storeData?.shop_name;
          console.log(`Firebase'den mağaza bulundu: ${shopName} (ID: ${shopId})`);
          
          // Mağaza ID'sine göre API anahtarlarını al
          if (shopId) {
            const apiKeyRef = adminDb.collection('etsy_api_keys').doc(shopId);
            const apiKeyDoc = await apiKeyRef.get();
            
            if (apiKeyDoc.exists) {
              const apiKeyData = apiKeyDoc.data();
              apiKey = apiKeyData?.api_key || '';
              accessToken = apiKeyData?.access_token;
              isConnected = true;
              console.log('Firebase\'den API anahtarları başarıyla alındı');
              
              // Etsy API'ye bağlantıyı test et
              try {
                console.log(`Etsy API bağlantısı test ediliyor - Shop ID: ${shopId}`);
                const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}`, {
                  headers: {
                    'x-api-key': apiKey,
                    'Authorization': `Bearer ${accessToken}`
                  }
                });

                if (!response.ok) {
                  console.error('Etsy API bağlantı hatası:', response.status);
                  return NextResponse.json({
                    isConnected: false,
                    store: shopId ? { shop_id: parseInt(shopId), shop_name: shopName } : null,
                    shopId: shopId,
                    shopName: shopName,
                    error: `Etsy API hatası: ${response.status}`
                  });
                }

                const data = await response.json();
                console.log('Etsy API bağlantısı başarılı:', data.shop_name);
                
                // Başarılı bağlantı
                return NextResponse.json({
                  isConnected: true,
                  store: {
                    shop_id: data.shop_id,
                    shop_name: data.shop_name
                  },
                  shopId: data.shop_id.toString(),
                  shopName: data.shop_name,
                  shopData: data
                });
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
                console.error('Etsy API bağlantı kontrolü sırasında hata:', error);
                
                return NextResponse.json({
                  isConnected: false,
                  store: shopId ? { shop_id: parseInt(shopId), shop_name: shopName } : null,
                  shopId: shopId,
                  shopName: shopName,
                  error: `Etsy API bağlantı hatası: ${errorMessage}`
                });
              }
            } else {
              console.log(`Mağaza ID ${shopId} için API anahtarları bulunamadı`);
            }
          }
        } else {
          console.log(`Firebase'de kullanıcı ${userId} için bağlı mağaza bulunamadı`);
        }
      } catch (error) {
        console.error('Firebase\'den API bilgileri alınamadı:', error);
      }
    } else {
      console.log('Firebase bağlantısı yok, çevresel değişkenlerden API bilgileri kullanılacak');
    }

    // API bilgileri tam değilse, bağlantı yok demektir
    return NextResponse.json({
      isConnected: false,
      store: null,
      shopId: null,
      shopName: null,
      error: 'Etsy bağlantısı bulunamadı'
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Etsy bağlantı durumu kontrol edilirken hata oluştu:', error);
    
    return NextResponse.json({
      isConnected: false,
      store: null,
      shopId: null,
      shopName: null,
      error: `Bağlantı durumu kontrol edilemedi: ${errorMessage}`
    });
  }
}