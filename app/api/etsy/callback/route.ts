import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
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

    // Kullanıcı bilgilerini al
    const userResponse = await fetch('https://openapi.etsy.com/v3/application/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'x-api-key': process.env.ETSY_CLIENT_ID!,
      },
    });

    if (!userResponse.ok) {
      console.error('Kullanıcı bilgileri alınamadı:', await userResponse.text());
      return NextResponse.redirect(new URL('/stores?error=user_failed', request.url));
    }

    const userData = await userResponse.json();
    console.log('Kullanıcı bilgileri alındı:', userData.user_id);

    // Mağaza bilgilerini al - tüm mağazaları dahil et
    const shopsResponse = await fetch(`https://openapi.etsy.com/v3/application/users/${userData.user_id}/shops?include_inactive=true`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'x-api-key': process.env.ETSY_CLIENT_ID!,
      },
    });

    if (!shopsResponse.ok) {
      console.error('Mağaza bilgileri alınamadı:', await shopsResponse.text());
      return NextResponse.redirect(new URL('/stores?error=shops_failed', request.url));
    }

    const shopsData = await shopsResponse.json();
    console.log('Mağaza bilgileri alındı:', shopsData.results?.length, 'mağaza');

    // Güvenlik kontrolü - mağaza bilgilerini kontrol et
    if (!shopsData || !shopsData.results || shopsData.results.length === 0) {
      console.error('Kullanıcının mağazası bulunamadı veya Etsy API boş cevap döndü');
      return NextResponse.redirect(new URL('/stores?error=no_shop_found', request.url));
    }

    const shop = shopsData.results[0];
    console.log('İlk mağaza seçildi:', shop.shop_name);

    // Firebase'e kaydet
    if (!adminDb) {
      console.error('Firebase admin başlatılamadı');
      return NextResponse.redirect(new URL('/stores?error=firebase_failed', request.url));
    }

    const storeData = {
      user_id: userData.user_id,
      shop_id: shop.shop_id,
      shop_name: shop.shop_name,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
      connected_at: new Date(),
    };

    await adminDb.collection('etsy_stores').doc(userData.user_id.toString()).set(storeData);
    console.log('Mağaza Firebase\'e kaydedildi');

    return NextResponse.redirect(new URL('/stores?success=connected', request.url));
  } catch (error) {
    console.error('Etsy callback genel hatası:', error);
    return NextResponse.redirect(new URL('/stores?error=general', request.url));
  }
}