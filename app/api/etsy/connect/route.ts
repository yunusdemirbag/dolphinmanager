import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';
import crypto from 'crypto';

// PKCE için yardımcı fonksiyonlar
function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(plain: string): Buffer {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.createHash('sha256').update(data).digest();
}

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key gerekli' },
        { status: 400 }
      );
    }

    console.log('Etsy API key ile bağlantı test ediliyor...');

    // Etsy API ile kullanıcı bilgilerini test et
    const userResponse = await fetch('https://openapi.etsy.com/v3/application/users/me', {
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Etsy API key test hatası:', errorText);
      return NextResponse.json(
        { error: 'Geçersiz API key' },
        { status: 401 }
      );
    }

    const userData = await userResponse.json();
    console.log('Kullanıcı bilgileri alındı:', userData.user_id);

    // Mağaza bilgilerini al
    const shopsResponse = await fetch(`https://openapi.etsy.com/v3/application/users/${userData.user_id}/shops`, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (!shopsResponse.ok) {
      console.error('Mağaza bilgileri alınamadı:', await shopsResponse.text());
      return NextResponse.json(
        { error: 'Mağaza bilgileri alınamadı' },
        { status: 400 }
      );
    }

    const shopsData = await shopsResponse.json();
    console.log('Mağaza bilgileri alındı:', shopsData.results?.length, 'mağaza');

    if (!shopsData.results || shopsData.results.length === 0) {
      return NextResponse.json(
        { error: 'Bu hesaba bağlı mağaza bulunamadı' },
        { status: 400 }
      );
    }

    const shop = shopsData.results[0];

    // Firebase'e kaydet
    if (!adminDb) {
      console.error('Firebase admin başlatılamadı');
      return NextResponse.json(
        { error: 'Database bağlantı hatası' },
        { status: 500 }
      );
    }

    const storeData = {
      user_id: userData.user_id,
      shop_id: shop.shop_id,
      shop_name: shop.shop_name,
      api_key: apiKey,
      connected_at: new Date(),
      connection_type: 'personal_access',
    };

    await adminDb.collection('etsy_stores').doc(userData.user_id.toString()).set(storeData);
    console.log('Mağaza Firebase\'e kaydedildi');

    return NextResponse.json({
      success: true,
      shop_name: shop.shop_name,
      shop_id: shop.shop_id,
      user_id: userData.user_id,
    });

  } catch (error) {
    console.error('Etsy API key bağlantı hatası:', error);
    return NextResponse.json(
      { error: 'Bağlantı hatası oluştu' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Firebase Admin'i başlat
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin başlatılamadı');
    }

    // Kullanıcı kimliği
    const userId = process.env.MOCK_USER_ID || 'local-user-123';

    // State ve PKCE için code verifier oluştur
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = base64URLEncode(crypto.randomBytes(32));
    const codeChallenge = base64URLEncode(sha256(codeVerifier));
    const sessionId = crypto.randomBytes(16).toString('hex');
    const stateWithSession = `${state}:${sessionId}`;

    // Session bilgilerini Firebase'e kaydet
    const sessionRef = adminDb.collection('etsy_auth_sessions').doc(sessionId);
    await sessionRef.set({
      state,
      codeVerifier,
      userId,
      created_at: new Date()
    });

    // OAuth URL'sini oluştur
    const scope = 'email_r shops_r shops_w listings_r listings_w listings_d transactions_r transactions_w profile_r address_r address_w billing_r cart_r cart_w';
    const redirectUri = process.env.ETSY_REDIRECT_URI;
    const clientId = process.env.ETSY_CLIENT_ID;

    if (!clientId || !redirectUri) {
      throw new Error('ETSY_CLIENT_ID veya ETSY_REDIRECT_URI çevre değişkenleri tanımlanmamış');
    }

    const url = new URL('https://www.etsy.com/oauth/connect');
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('scope', scope);
    url.searchParams.append('state', stateWithSession);
    url.searchParams.append('code_challenge', codeChallenge);
    url.searchParams.append('code_challenge_method', 'S256');

    // URL'yi döndür
    return NextResponse.json({
      url: url.toString()
    });
  } catch (error: any) {
    console.error('OAuth URL oluşturma hatası:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'OAuth URL oluşturulamadı' 
      },
      { status: 500 }
    );
  }
}