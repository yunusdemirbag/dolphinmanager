import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin başlatılamadı');
    }

    const userId = process.env.MOCK_USER_ID || 'local-user-123';
    
    // Tüm mağazaları getir
    const storesSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .get();
    
    if (storesSnapshot.empty) {
      return NextResponse.json({ success: false, message: 'Mağaza bulunamadı' });
    }
    
    const updatedStores = [];
    
    // Her mağaza için ikon güncelle
    for (const storeDoc of storesSnapshot.docs) {
      const storeData = storeDoc.data();
      const shopId = storeData.shop_id;
      
      // API anahtarını al
      const apiKeyDoc = await adminDb.collection('etsy_api_keys').doc(storeDoc.id).get();
      if (!apiKeyDoc.exists) {
        console.log(`${shopId} için API anahtarı bulunamadı`);
        continue;
      }
      
      const apiKeyData = apiKeyDoc.data();
      const accessToken = apiKeyData?.access_token;
      
      if (!accessToken) {
        console.log(`${shopId} için access token bulunamadı`);
        continue;
      }
      
      // Mağaza ikonunu al
      try {
        const shopImageResponse = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/shop-image`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-api-key': process.env.ETSY_CLIENT_ID!,
          },
        });
        
        if (shopImageResponse.ok) {
          const shopImageData = await shopImageResponse.json();
          if (shopImageData && shopImageData.url) {
            // Mağaza ikonunu güncelle
            await adminDb.collection('etsy_stores').doc(storeDoc.id).update({
              shop_icon_url: shopImageData.url
            });
            
            console.log(`${storeData.shop_name} için ikon güncellendi: ${shopImageData.url}`);
            updatedStores.push({
              id: storeDoc.id,
              shop_name: storeData.shop_name,
              shop_icon_url: shopImageData.url
            });
          }
        } else {
          console.log(`${storeData.shop_name} için ikon bulunamadı`);
        }
      } catch (error) {
        console.error(`${storeData.shop_name} için ikon güncellenirken hata:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${updatedStores.length} mağaza ikonu güncellendi`,
      updatedStores
    });
  } catch (error: any) {
    console.error('Mağaza ikonları güncellenirken hata:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Mağaza ikonları güncellenemedi' 
      },
      { status: 500 }
    );
  }
} 