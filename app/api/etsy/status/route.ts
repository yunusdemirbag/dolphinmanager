import { NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

// Token refresh fonksiyonu
async function refreshEtsyToken(shopId: string): Promise<string | null> {
  console.log(`♻️ Refreshing Etsy token for shop ${shopId}...`);

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

  // Token'ı Firebase'e kaydet - expires_at hesaplamasını düzelt
  const expiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));
  console.log(`🕒 New token expires at: ${expiresAt.toISOString()}`);

  await adminDb.collection('etsy_api_keys').doc(shopId).update({
    access_token: newAccessToken,
    refresh_token: newTokens.refresh_token || refresh_token, // Etsy might send a new refresh token
    expires_at: expiresAt,
    updated_at: new Date()
  });

  console.log(`✅ Successfully refreshed and saved new token for shop ${shopId}.`);
  return newAccessToken;
}

export async function GET() {
  try {
    // Firebase'i başlat
    initializeAdminApp();
    
    // Firebase'den API bilgilerini al
    let shopId = null;
    let shopName = null;
    let apiKey = process.env.ETSY_API_KEY || '';
    let accessToken = process.env.ETSY_ACCESS_TOKEN;
    let isConnected = false;
    
    // Kullanıcı kimliği - gerçek ortamda session'dan gelecek
    const userId = process.env.MOCK_USER_ID || 'local-user-123';

    if (adminDb) {
      try {
        console.log(`Firebase bağlantısı mevcut, kullanıcı ${userId} için mağaza bilgileri alınıyor...`);
        
        // Kullanıcı ID'sine göre mağaza bilgilerini al
        const storesRef = adminDb.collection('etsy_stores').where('user_id', '==', userId).where('is_active', '==', true);
        const storeSnapshot = await storesRef.limit(1).get();
        
        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data();
          shopId = storeData?.shop_id?.toString();
          shopName = storeData?.shop_name;
          console.log(`Firebase'den mağaza bulundu: ${shopName} (ID: ${shopId})`);
          
          // Mağaza ID'sine göre API anahtarlarını al
          if (shopId) {
            const apiKeyRef = adminDb.collection('etsy_api_keys').doc(shopId);
            const apiKeyDoc = await apiKeyRef.get();
            
            if (apiKeyDoc.exists) {
              const apiKeyData = apiKeyDoc.data();
              apiKey = apiKeyData?.api_key || '';
              accessToken = apiKeyData?.access_token;
              const expiresAt = apiKeyData?.expires_at;
              isConnected = true;
              console.log('Firebase\'den API anahtarları başarıyla alındı');
              
              // Proaktif token refresh - expires_at'dan 1 saat önce refresh yap
              if (expiresAt) {
                const expiresTime = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
                const timeUntilExpiry = expiresTime.getTime() - Date.now();
                const oneHourInMs = 60 * 60 * 1000;
                
                console.log(`🕒 Token expires at: ${expiresTime.toISOString()}`);
                console.log(`⏰ Time until expiry: ${Math.round(timeUntilExpiry / 1000 / 60)} minutes`);
                
                if (timeUntilExpiry < oneHourInMs) {
                  console.log('🔄 Token expiring soon, proactively refreshing...');
                  const newToken = await refreshEtsyToken(shopId);
                  if (newToken) {
                    accessToken = newToken;
                    console.log('✅ Proactive token refresh successful');
                  }
                }
              }
              
              // Etsy API'ye bağlantıyı test et - token refresh ile
              try {
                console.log(`Etsy API bağlantısı test ediliyor - Shop ID: ${shopId}`);
                let currentAccessToken = accessToken;
                
                const testApiCall = async (token: string, isRetry = false): Promise<Response> => {
                  const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}`, {
                    headers: {
                      'x-api-key': apiKey,
                      'Authorization': `Bearer ${token}`
                    }
                  });

                  // 401 hatası ve ilk deneme ise token refresh yap
                  if (response.status === 401 && !isRetry) {
                    console.warn(`Token expired for shop ${shopId}. Attempting to refresh...`);
                    const newAccessToken = await refreshEtsyToken(shopId);
                    if (newAccessToken) {
                      console.log("Retrying API call with new token...");
                      currentAccessToken = newAccessToken;
                      return testApiCall(newAccessToken, true); // Retry ile çağır
                    }
                  }

                  return response;
                };

                const response = await testApiCall(currentAccessToken);

                if (!response.ok) {
                  console.error('Etsy API bağlantı hatası:', response.status);
                  return NextResponse.json({
                    isConnected: false,
                    store: shopId ? { shop_id: parseInt(shopId), shop_name: shopName } : null,
                    shopId: shopId,
                    shopName: shopName,
                    error: `Etsy API hatası: ${response.status}`,
                    tokenRefreshAttempted: currentAccessToken !== accessToken
                  });
                }

                const data = await response.json();
                console.log('Etsy API bağlantısı başarılı:', data.shop_name);
                
                // Rate limit bilgilerini al ve logla
                console.log('📊 Etsy API Headers:');
                console.log('- x-ratelimit-remaining:', response.headers.get('x-ratelimit-remaining'));
                console.log('- x-ratelimit-limit:', response.headers.get('x-ratelimit-limit'));
                console.log('- x-ratelimit-reset:', response.headers.get('x-ratelimit-reset'));
                console.log('- x-limit-per-day:', response.headers.get('x-limit-per-day'));
                
                const rateLimitInfo = {
                  hourly_limit: response.headers.get('x-ratelimit-limit'),
                  hourly_remaining: response.headers.get('x-ratelimit-remaining'),
                  daily_limit: response.headers.get('x-limit-per-day'),
                  reset: response.headers.get('x-ratelimit-reset')
                };
                
                // Başarılı bağlantı
                return NextResponse.json({
                  isConnected: true,
                  store: {
                    shop_id: data.shop_id,
                    shop_name: data.shop_name
                  },
                  shopId: data.shop_id.toString(),
                  shopName: data.shop_name,
                  shopData: data,
                  apiLimit: {
                    hourly_limit: rateLimitInfo.hourly_limit ? parseInt(rateLimitInfo.hourly_limit) : null,
                    hourly_remaining: rateLimitInfo.hourly_remaining ? parseInt(rateLimitInfo.hourly_remaining) : null,
                    daily_limit: rateLimitInfo.daily_limit ? parseInt(rateLimitInfo.daily_limit) : null,
                    reset: rateLimitInfo.reset ? new Date(parseInt(rateLimitInfo.reset) * 1000).toISOString() : null
                  }
                });
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
                console.error('Etsy API bağlantı kontrolü sırasında hata:', error);
                
                return NextResponse.json({
                  isConnected: false,
                  store: shopId ? { shop_id: parseInt(shopId), shop_name: shopName } : null,
                  shopId: shopId,
                  shopName: shopName,
                  error: `Etsy API bağlantı hatası: ${errorMessage}`
                });
              }
            } else {
              console.log(`Mağaza ID ${shopId} için API anahtarları bulunamadı`);
            }
          }
        } else {
          console.log(`Firebase'de kullanıcı ${userId} için bağlı mağaza bulunamadı`);
        }
      } catch (error) {
        console.error('Firebase\'den API bilgileri alınamadı:', error);
      }
    } else {
      console.log('Firebase bağlantısı yok, çevresel değişkenlerden API bilgileri kullanılacak');
    }

    // API bilgileri tam değilse, bağlantı yok demektir
    return NextResponse.json({
      isConnected: false,
      store: null,
      shopId: null,
      shopName: null,
      error: 'Etsy bağlantısı bulunamadı'
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Etsy bağlantı durumu kontrol edilirken hata oluştu:', error);
    
    return NextResponse.json({
      isConnected: false,
      store: null,
      shopId: null,
      shopName: null,
      error: `Bağlantı durumu kontrol edilemedi: ${errorMessage}`
    });
  }
}