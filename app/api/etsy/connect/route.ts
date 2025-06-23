import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

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