import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Firebase Admin'i başlat
    initializeAdminApp();
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Etsy callback hatası:', error);
      return NextResponse.redirect(new URL('/stores?error=auth_failed', request.url));
    }

    if (!code || !stateParam) {
      console.error('Etsy callback - kod veya state parametresi eksik');
      return NextResponse.redirect(new URL('/stores?error=missing_params', request.url));
    }

    // State'ten sessionId'yi çıkar
    const [state, sessionId] = stateParam.split(':');
    if (!state || !sessionId) {
      console.error('Geçersiz state formatı');
      return NextResponse.redirect(new URL('/stores?error=invalid_state', request.url));
    }

    console.log('Etsy callback alındı:', { code: code.substring(0, 10) + '...', sessionId });

    // Session bilgilerini Firebase'den al
    if (!adminDb) {
      console.error('Firebase admin başlatılamadı');
      return NextResponse.redirect(new URL('/stores?error=firebase_failed', request.url));
    }

    const sessionDoc = await adminDb.collection('etsy_auth_sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      console.error('Session bulunamadı');
      return NextResponse.redirect(new URL('/stores?error=session_not_found', request.url));
    }

    const sessionData = sessionDoc.data();
    if (sessionData?.state !== state) {
      console.error('State uyuşmazlığı');
      return NextResponse.redirect(new URL('/stores?error=state_mismatch', request.url));
    }
    const appUserId = sessionData.userId || process.env.MOCK_USER_ID;
    if (!appUserId) {
      console.error('Oturumda kullanıcı kimliği bulunamadı.');
      return NextResponse.redirect(new URL('/stores?error=no_userid_in_session', request.url));
    }

    // Session'u sil
    await adminDb.collection('etsy_auth_sessions').doc(sessionId).delete();

    // Token exchange
    const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ETSY_CLIENT_ID!,
        client_secret: process.env.ETSY_CLIENT_SECRET!,
        code: code,
        redirect_uri: process.env.ETSY_REDIRECT_URI!,
        code_verifier: sessionData.codeVerifier
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange hatası:', errorText);
      return NextResponse.redirect(new URL('/stores?error=token_failed', request.url));
    }

    const tokenData = await tokenResponse.json();
    console.log('Token alındı:', { access_token: tokenData.access_token?.substring(0, 10) + '...' });

    // Kullanıcı ve mağaza bilgilerini tek seferde al
    const meResponse = await fetch('https://openapi.etsy.com/v3/application/users/me?includes=shops', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'x-api-key': process.env.ETSY_CLIENT_ID!,
      },
    });

    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      console.error('Kullanıcı/mağaza bilgileri alınamadı:', errorText);
      return NextResponse.redirect(new URL('/stores?error=me_endpoint_failed', request.url));
    }

    const meData = await meResponse.json();
    console.log('Kullanıcı bilgileri alındı:', meData.user_id);
    console.log('Mağaza bilgileri:', meData.shops?.length, 'mağaza');

    if (!meData.shop_id) {
      console.error('Kullanıcının mağaza ID\'si bulunamadı');
      return NextResponse.redirect(new URL('/stores?error=no_shop_id_in_me', request.url));
    }

    const shopIdInt = parseInt(meData.shop_id.toString(), 10);
    if (isNaN(shopIdInt)) {
      console.error('Geçersiz mağaza ID formatı');
      return NextResponse.redirect(new URL('/stores?error=invalid_shop_id', request.url));
    }

    // Shop bilgilerini al
    const shopResponse = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopIdInt}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'x-api-key': process.env.ETSY_CLIENT_ID!,
      },
    });

    if (!shopResponse.ok) {
      const errorText = await shopResponse.text();
      console.error('Mağaza detayları alınamadı:', errorText);
      return NextResponse.redirect(new URL('/stores?error=shop_details_failed', request.url));
    }

    const shop = await shopResponse.json();
    console.log('Mağaza seçildi:', shop.shop_name);

    // Mağaza ikonunu al
    let shopIconUrl = null;
    try {
      const shopImageResponse = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopIdInt}/shop-image`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'x-api-key': process.env.ETSY_CLIENT_ID!,
        },
      });
      
      if (shopImageResponse.ok) {
        const shopImageData = await shopImageResponse.json();
        if (shopImageData && shopImageData.url) {
          shopIconUrl = shopImageData.url;
          console.log('Mağaza ikonu alındı:', shopIconUrl);
        }
      } else {
        console.log('Mağaza ikonu bulunamadı veya erişilemedi');
      }
    } catch (imageError) {
      console.error('Mağaza ikonu alınırken hata:', imageError);
    }

    // Batch işlemi başlat
    const batch = adminDb.batch();
    const shopIdStr = shop.shop_id.toString();

    // Önce diğer mağazaları pasif yap
    const existingStoresSnapshot = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', appUserId)
      .get();

    existingStoresSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { is_active: false });
    });

    // Yeni mağazayı aktif olarak ekle
    const storeData = {
      user_id: appUserId,
      etsy_user_id: meData.user_id,
      shop_id: shop.shop_id,
      shop_name: shop.shop_name,
      shop_icon_url: shopIconUrl,
      connected_at: new Date(),
      last_sync_at: new Date(),
      is_active: true
    };

    // API anahtarlarını ayrı koleksiyonda sakla
    const apiKeysData = {
      api_key: process.env.ETSY_CLIENT_ID!,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
      updated_at: new Date()
    };

    const storeRef = adminDb.collection('etsy_stores').doc(shopIdStr);
    const apiKeysRef = adminDb.collection('etsy_api_keys').doc(shopIdStr);

    batch.set(storeRef, storeData);
    batch.set(apiKeysRef, apiKeysData);

    // Batch işlemini uygula
    await batch.commit();
    console.log('Mağaza ve API bilgileri Firebase\'e kaydedildi, ID:', shopIdStr);

    return NextResponse.redirect(new URL('/stores?success=connected&refresh=true', request.url));
  } catch (error: any) {
    console.error('Etsy callback genel hatası:', error);
    return NextResponse.redirect(new URL('/stores?error=general', request.url));
  }
}