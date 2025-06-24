import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    console.log('🏪 Shop sections API çağrıldı');
    
    // Firebase Admin'i initialize et
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // Kullanıcının Etsy credentials'ını al
    const userId = 'local-user-123'; // Bu gerçek auth context'den gelecek
    
    // Aktif mağazayı bul
    const storesSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .where('is_active', '==', true)
      .get();
    
    if (storesSnapshot.empty) {
      return NextResponse.json({ 
        error: 'Etsy hesabınız bağlı değil', 
        code: 'NO_ETSY_TOKEN' 
      }, { status: 400 });
    }

    const storeDoc = storesSnapshot.docs[0];
    const shop_id = storeDoc.id;
    
    // API anahtarlarını al
    const apiKeysDoc = await adminDb.collection('etsy_api_keys').doc(shop_id).get();
    
    if (!apiKeysDoc.exists) {
      return NextResponse.json({ 
        error: 'Etsy token bilgileri bulunamadı', 
        code: 'NO_API_KEYS' 
      }, { status: 400 });
    }

    const apiKeysData = apiKeysDoc.data()!;
    const { access_token, api_key } = apiKeysData;
    
    if (!access_token || !api_key) {
      return NextResponse.json({ 
        error: 'Etsy token geçersiz', 
        code: 'INVALID_ETSY_TOKEN' 
      }, { status: 400 });
    }

    console.log('🔑 Etsy credentials alındı, shop_id:', shop_id);
    
    // Etsy API'den shop sections'ları çek
    const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shop_id}/sections`, {
      headers: { 
        'Authorization': `Bearer ${access_token}`, 
        'x-api-key': api_key 
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Etsy shop sections API hatası:', response.status, errorText);
      return NextResponse.json({ 
        error: 'Etsy shop sections alınamadı',
        details: errorText 
      }, { status: response.status });
    }

    const etsyData = await response.json();
    console.log('✅ Etsy shop sections alındı:', etsyData.results?.length || 0, 'adet');
    
    // Etsy'den gelen data formatını dönüştür
    const sections = etsyData.results?.map((section: any) => ({
      shop_section_id: section.shop_section_id,
      title: section.title,
      rank: section.rank || 0,
      active_listing_count: section.active_listing_count || 0
    })) || [];

    // Mock data'yı da ekle (eğer hiç section yoksa)
    if (sections.length === 0) {
      console.log('⚠️ Etsy\'de section yok, mock data ekleniyor');
      sections.push(
        { shop_section_id: 1, title: "Woman Art", rank: 1, active_listing_count: 10 },
        { shop_section_id: 2, title: "Abstract Art", rank: 2, active_listing_count: 5 },
        { shop_section_id: 3, title: "Love Art", rank: 3, active_listing_count: 8 },
        { shop_section_id: 4, title: "Flowers Art", rank: 4, active_listing_count: 12 },
        { shop_section_id: 5, title: "Landscape Art", rank: 5, active_listing_count: 7 }
      );
    }

    return NextResponse.json({ sections });
    
  } catch (error) {
    console.error('❌ Shop sections API hatası:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Shop sections alınamadı' 
    }, { status: 500 });
  }
}