import { NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function GET() {
  try {
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase admin not initialized' }, { status: 500 });
    }

    const userId = 'local-user-123';
    
    // Mağaza bilgilerini al
    const storesSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .where('is_active', '==', true)
      .get();

    if (storesSnapshot.empty) {
      return NextResponse.json({
        status: 'no_store',
        message: 'Aktif mağaza bulunamadı',
        user_id: userId
      });
    }

    const storeDoc = storesSnapshot.docs[0];
    const storeData = storeDoc.data();
    const shopId = storeDoc.id;

    // Token bilgilerini al
    const apiKeysDoc = await adminDb.collection('etsy_api_keys').doc(shopId).get();
    
    if (!apiKeysDoc.exists) {
      return NextResponse.json({
        status: 'no_tokens',
        message: 'Token bilgileri bulunamadı',
        shop_id: shopId,
        store_data: storeData
      });
    }

    const apiKeysData = apiKeysDoc.data()!;
    const now = new Date();
    const expiresAt = apiKeysData.expires_at?.toDate();
    const isExpired = expiresAt ? expiresAt < now : true;
    
    console.log('🔍 Token Durumu Kontrol Ediliyor:', {
      shop_id: shopId,
      shop_name: storeData.shop_name,
      expires_at: expiresAt?.toISOString(),
      now: now.toISOString(),
      is_expired: isExpired,
      has_access_token: !!apiKeysData.access_token,
      has_refresh_token: !!apiKeysData.refresh_token,
      access_token_prefix: apiKeysData.access_token?.substring(0, 20) + '...'
    });

    // Etsy API'sine test çağrısı yap
    let apiTestResult = null;
    if (apiKeysData.access_token) {
      try {
        console.log('🧪 Etsy API test çağrısı yapılıyor...');
        const testResponse = await fetch('https://openapi.etsy.com/v3/application/users/me', {
          headers: {
            'Authorization': `Bearer ${apiKeysData.access_token}`,
            'x-api-key': process.env.ETSY_CLIENT_ID!,
          },
        });

        apiTestResult = {
          status: testResponse.status,
          ok: testResponse.ok,
          statusText: testResponse.statusText
        };

        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          apiTestResult.error = errorText;
          console.log('❌ Etsy API test başarısız:', errorText);
        } else {
          console.log('✅ Etsy API test başarılı');
        }
      } catch (error) {
        apiTestResult = {
          error: error instanceof Error ? error.message : 'API test failed',
          status: 'network_error'
        };
        console.log('❌ Etsy API test ağ hatası:', error);
      }
    }

    return NextResponse.json({
      status: 'active_store_found',
      shop_id: shopId,
      shop_name: storeData.shop_name,
      user_id: userId,
      token_info: {
        has_access_token: !!apiKeysData.access_token,
        has_refresh_token: !!apiKeysData.refresh_token,
        access_token_length: apiKeysData.access_token?.length || 0,
        expires_at: expiresAt?.toISOString(),
        is_expired: isExpired,
        minutes_until_expiry: expiresAt ? Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60)) : null,
        last_refresh: apiKeysData.last_refresh_at?.toDate()?.toISOString(),
        updated_at: apiKeysData.updated_at?.toDate()?.toISOString()
      },
      etsy_api_test: apiTestResult,
      recommendations: isExpired ? [
        'Token süresi dolmuş - Token Yenile butonunu kullanın',
        'Veya mağazayı yeniden bağlayın'
      ] : apiTestResult?.ok === false ? [
        'Token geçerli ama API erişimi başarısız',
        'Token Yenile butonunu deneyin',
        'Etsy hesap durumunuzu kontrol edin'
      ] : [
        'Token durumu normal görünüyor',
        'Başka bir sorun olabilir'
      ]
    });

  } catch (error) {
    console.error('❌ Token debug hatası:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Debug failed',
      status: 'error'
    }, { status: 500 });
  }
}