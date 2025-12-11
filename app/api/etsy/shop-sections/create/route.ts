import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();
    
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Kategori adı gerekli' 
      }, { status: 400 });
    }

    // Firebase Admin'i initialize et
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // Kullanıcının Etsy credentials'ını al
    const userId = 'local-user-123';
    
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
    
    console.log(`🎯 Yeni kategori oluşturuluyor: "${title}" - Shop ID: ${shop_id}`);
    
    // Etsy API'ye kategori oluşturma isteği
    const formData = new FormData();
    formData.append('title', title);
    
    const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shop_id}/sections`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'x-api-key': api_key,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Etsy kategori oluşturma hatası:', response.status, errorText);
      
      // Eğer aynı isimde kategori varsa mevcut olanı bul ve döndür
      if (errorText.includes('duplicate') || errorText.includes('already exists')) {
        console.log('⚠️ Aynı isimde kategori zaten var, mevcut kategori aranıyor...');
        
        // Mevcut kategorileri al
        const sectionsResponse = await fetch(`https://openapi.etsy.com/v3/application/shops/${shop_id}/sections`, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-api-key': api_key,
          }
        });
        
        if (sectionsResponse.ok) {
          const sectionsData = await sectionsResponse.json();
          const existingSection = sectionsData.results?.find((s: any) => 
            s.title.toLowerCase() === title.toLowerCase()
          );
          
          if (existingSection) {
            console.log('✅ Mevcut kategori bulundu:', existingSection.shop_section_id, existingSection.title);
            return NextResponse.json({
              success: true,
              shop_section_id: existingSection.shop_section_id,
              title: existingSection.title,
              existing: true
            });
          }
        }
      }
      
      return NextResponse.json({
        error: `Kategori oluşturulamadı: ${errorText}`,
        code: 'ETSY_API_ERROR'
      }, { status: response.status });
    }
    
    const result = await response.json();
    console.log('✅ Yeni kategori oluşturuldu:', result.shop_section_id, result.title);
    
    // Cache'i temizle ki yeni kategori görünsün
    try {
      // 1. Client-side cache temizle
      if (typeof sessionStorage !== 'undefined') {
        const cacheKey = `etsy-shop-sections-${shop_id}`;
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem('etsy-shop-sections');
      }
      
      // 2. Server-side cache temizle
      const SECTIONS_CACHE_KEY = `shop_sections_${shop_id}`;
      await adminDb.collection('sections_cache').doc(SECTIONS_CACHE_KEY).delete();
      console.log('✅ Server-side kategori cache temizlendi');
    } catch (cacheError) {
      console.error('⚠️ Cache temizleme hatası (işleme devam edilecek):', cacheError);
    }
    
    return NextResponse.json({
      success: true,
      shop_section_id: result.shop_section_id,
      title: result.title,
      created: true
    });
    
  } catch (error) {
    console.error('❌ Kategori oluşturma hatası:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Kategori oluşturulamadı',
      success: false
    }, { status: 500 });
  }
}