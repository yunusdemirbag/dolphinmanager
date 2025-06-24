import { NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    initializeAdminApp();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase admin not initialized' }, { status: 500 });
    }

    const { shop_id, user_id } = await request.json();

    if (!shop_id) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`Token yenileniyor: ${shop_id} (Kullanıcı: ${user_id})`);

    // Shop ID'yi string olarak kullan
    const shopIdStr = shop_id.toString();

    // Mevcut token'ları al
    const apiKeysDoc = await adminDb.collection('etsy_api_keys').doc(shopIdStr).get();
    
    if (!apiKeysDoc.exists) {
      return NextResponse.json({ 
        success: false,
        error: 'Token bilgileri bulunamadı' 
      }, { status: 404 });
    }

    const apiKeysData = apiKeysDoc.data()!;
    const { refresh_token, api_key } = apiKeysData;

    if (!refresh_token) {
      return NextResponse.json({ 
        success: false,
        error: 'Refresh token bulunamadı' 
      }, { status: 400 });
    }

    console.log('🔄 Refresh token ile yeni access token alınıyor...');

    // Etsy'den yeni token al
    const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ETSY_CLIENT_ID!,
        refresh_token: refresh_token,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token yenileme hatası:', errorText);
      return NextResponse.json({ 
        success: false,
        error: 'Token yenilenemedi - Etsy API hatası' 
      }, { status: tokenResponse.status });
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Yeni token alındı');
    console.log('🔍 Etsy API token detayları:', {
      expires_in: tokenData.expires_in,
      expires_in_minutes: Math.round(tokenData.expires_in / 60),
      expires_in_hours: Math.round(tokenData.expires_in / 3600),
      calculated_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      current_time: new Date().toISOString()
    });

    // Yeni token'ları Firebase'e kaydet
    const updatedApiKeysData = {
      ...apiKeysData,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refresh_token, // Yeni refresh token yoksa eskisini kullan
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
      updated_at: new Date(),
      last_refresh_at: new Date()
    };

    await adminDb.collection('etsy_api_keys').doc(shopIdStr).set(updatedApiKeysData);

    // Store'da da son güncelleme zamanını kaydet
    await adminDb.collection('etsy_stores').doc(shopIdStr).update({
      last_token_refresh: new Date()
    });

    console.log(`✅ Token başarıyla yenilendi: ${shop_id}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Token başarıyla yenilendi',
      expires_at: updatedApiKeysData.expires_at
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Token yenileme hatası:', error);
    return NextResponse.json({ 
      success: false,
      error: `Token yenilenemedi: ${errorMessage}` 
    }, { status: 500 });
  }
}