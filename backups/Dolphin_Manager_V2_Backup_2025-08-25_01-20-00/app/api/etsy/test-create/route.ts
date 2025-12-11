import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TEST: Direkt Etsy listing test başlatılıyor...');
    
    // FormData'dan veriyi al
    const formData = await request.formData();
    const listingDataString = formData.get('listingData') as string;
    
    console.log('📋 TEST: Alınan listingData string uzunluğu:', listingDataString?.length);
    
    if (!listingDataString) {
      return NextResponse.json({ 
        error: 'Listing data is required',
        test_result: 'FAILED_NO_DATA'
      }, { status: 400 });
    }
    
    let listingData;
    try {
      listingData = JSON.parse(listingDataString);
      console.log('✅ TEST: JSON parse başarılı');
    } catch (parseError) {
      console.error('❌ TEST: JSON parse hatası:', parseError);
      return NextResponse.json({ 
        error: 'Invalid listing data format',
        test_result: 'FAILED_JSON_PARSE',
        details: parseError.message
      }, { status: 400 });
    }
    
    console.log('📋 TEST: Listing data içeriği:', {
      title: listingData.title,
      has_variations: listingData.has_variations,
      variation_count: listingData.variations?.length || 0,
      price: listingData.price
    });
    
    // Firebase Test
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ 
        error: 'Firebase admin not initialized',
        test_result: 'FAILED_FIREBASE'
      }, { status: 500 });
    }
    console.log('✅ TEST: Firebase bağlantısı OK');
    
    // Store Test
    const userId = 'local-user-123';
    const storesSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .where('is_active', '==', true)
      .get();
    
    if (storesSnapshot.empty) {
      return NextResponse.json({ 
        error: 'No active store found',
        test_result: 'FAILED_NO_STORE'
      }, { status: 400 });
    }
    console.log('✅ TEST: Aktif mağaza bulundu');
    
    const storeDoc = storesSnapshot.docs[0];
    const shop_id = storeDoc.id;
    
    // Token Test
    const apiKeysDoc = await adminDb.collection('etsy_api_keys').doc(shop_id).get();
    if (!apiKeysDoc.exists) {
      return NextResponse.json({ 
        error: 'No API keys found',
        test_result: 'FAILED_NO_TOKENS'
      }, { status: 400 });
    }
    console.log('✅ TEST: API tokens bulundu');
    
    const apiKeysData = apiKeysDoc.data()!;
    const { access_token, api_key } = apiKeysData;
    
    // Etsy API Test - Basit call
    console.log('🧪 TEST: Etsy API bağlantısı test ediliyor...');
    const testResponse = await fetch('https://openapi.etsy.com/v3/application/users/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'x-api-key': api_key,
      },
    });
    
    console.log('📋 TEST: Etsy API yanıtı:', testResponse.status, testResponse.statusText);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      return NextResponse.json({ 
        error: 'Etsy API connection failed',
        test_result: 'FAILED_ETSY_API',
        api_status: testResponse.status,
        api_error: errorText
      }, { status: testResponse.status });
    }
    
    console.log('✅ TEST: Etsy API bağlantısı başarılı');
    
    return NextResponse.json({
      test_result: 'SUCCESS',
      message: 'Tüm testler başarılı',
      shop_id: shop_id,
      has_access_token: !!access_token,
      listing_data_received: true,
      variation_count: listingData.variations?.length || 0
    });
    
  } catch (error) {
    console.error('❌ TEST: Genel hata:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Test failed',
      test_result: 'FAILED_GENERAL',
      stack: error instanceof Error ? error.stack : 'No stack'
    }, { status: 500 });
  }
}