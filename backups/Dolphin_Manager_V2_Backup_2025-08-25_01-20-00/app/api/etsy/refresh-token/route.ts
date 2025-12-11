import { NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

// Token refresh fonksiyonu
async function refreshEtsyToken(shopId: string): Promise<string | null> {
  console.log(`♻️ Manual refresh request for shop ${shopId}...`);

  if (!adminDb) {
    console.error("Firebase Admin DB not initialized for token refresh.");
    return null;
  }

  const apiKeyDoc = await adminDb.collection('etsy_api_keys').doc(shopId).get();
  if (!apiKeyDoc.exists) {
    console.error(`API keys for shop ${shopId} not found.`);
    return null;
  }

  const { refresh_token } = apiKeyDoc.data()!;
  if (!refresh_token) {
    console.error(`No refresh token found for shop ${shopId}.`);
    return null;
  }

  const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID;
  if (!ETSY_CLIENT_ID) {
    console.error("ETSY_CLIENT_ID environment variable is not set.");
    return null;
  }

  const tokenUrl = 'https://api.etsy.com/v3/public/oauth/token';
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ETSY_CLIENT_ID,
      refresh_token: refresh_token,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to refresh Etsy token for shop ${shopId}: ${errorText}`);
    return null;
  }

  const newTokens = await response.json();
  const newAccessToken = newTokens.access_token;

  // Token'ı Firebase'e kaydet
  const expiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));
  console.log(`🕒 New token expires at: ${expiresAt.toISOString()}`);

  await adminDb.collection('etsy_api_keys').doc(shopId).update({
    access_token: newAccessToken,
    refresh_token: newTokens.refresh_token || refresh_token,
    expires_at: expiresAt,
    updated_at: new Date()
  });

  console.log(`✅ Successfully refreshed and saved new token for shop ${shopId}.`);
  return newAccessToken;
}

export async function POST() {
  try {
    initializeAdminApp();
    
    const userId = process.env.MOCK_USER_ID || 'local-user-123';

    if (!adminDb) {
      return NextResponse.json({ 
        success: false, 
        error: 'Firebase not initialized' 
      }, { status: 500 });
    }

    // Kullanıcının aktif mağazasını bul
    const storesRef = adminDb.collection('etsy_stores').where('user_id', '==', userId).where('is_active', '==', true);
    const storeSnapshot = await storesRef.limit(1).get();
    
    if (storeSnapshot.empty) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active store found' 
      }, { status: 404 });
    }

    const storeData = storeSnapshot.docs[0].data();
    const shopId = storeData?.shop_id?.toString();
    
    if (!shopId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Shop ID not found' 
      }, { status: 400 });
    }

    // Token'ı yenile
    const newToken = await refreshEtsyToken(shopId);
    
    if (newToken) {
      return NextResponse.json({ 
        success: true, 
        message: 'Token successfully refreshed',
        shopId: shopId,
        newTokenLength: newToken.length
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to refresh token' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}