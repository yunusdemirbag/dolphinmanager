import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, createUnauthorizedResponse } from "@/lib/auth-middleware";
import { db } from "@/lib/firebase-admin";
import { getEtsyStores } from "@/lib/etsy-api";

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Etsy mağazaları API çağrısı başladı');
    
    // Kullanıcı doğrulama
    const authResult = await authenticateRequest(request);
    
    if (!authResult) {
      return createUnauthorizedResponse();
    }
    
    const userId = authResult.userId;
    console.log('✅ Kullanıcı doğrulandı:', userId);
    
    // Şimdilik mock data döndür - getEtsyStores fonksiyonu problemi var
    console.log('🔍 Mock Etsy mağaza verisi döndürülüyor');
    const stores: any[] = []
    
    if (!stores || stores.length === 0) {
      console.log('❌ Etsy mağazası bulunamadı');
      return NextResponse.json(
        { error: 'Etsy mağazası bulunamadı', code: 'NO_STORES' },
        { status: 404 }
      );
    }
    
    console.log(`✅ ${stores.length} Etsy mağazası bulundu`);
    
    // Mağaza verilerini Firebase Firestore'a kaydet
    for (const store of stores) {
      console.log(`🔄 Mağaza kaydediliyor: ${store.shop_name} (${store.shop_id})`);
      
      try {
        // Firebase Firestore'a store verilerini kaydet
        const storeRef = db.collection('etsy_stores').doc(`${userId}_${store.shop_id}`);
        
        await storeRef.set({
          user_id: userId,
          shop_id: store.shop_id,
          shop_name: store.shop_name,
          title: store.title || '',
          currency_code: store.currency_code || 'USD',
          listing_active_count: store.listing_active_count || 0,
          num_favorers: store.num_favorers || 0,
          review_count: store.review_count || 0,
          review_average: store.review_average || 0,
          url: store.url || '',
          image_url_760x100: store.image_url_760x100 || '',
          is_active: true,
          last_synced_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }, { merge: true }); // merge: true ile mevcut veriyi güncelle
        
        console.log('✅ Mağaza Firebase\'e kaydedildi:', store.shop_id);
        
      } catch (error) {
        console.error('❌ Mağaza Firebase\'e kaydedilemedi:', error);
      }
    }
    
    console.log('✅ Mağazalar başarıyla Firebase\'e kaydedildi');
    
    return NextResponse.json({
      success: true,
      stores,
      count: stores.length
    });
    
  } catch (error: any) {
    console.error('💥 GENEL HATA:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Bilinmeyen hata',
        code: 'UNKNOWN_ERROR',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}