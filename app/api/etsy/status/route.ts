import { NextResponse } from 'next/server';
import {
  adminDb,
  initializeAdminApp,
} from '@/lib/firebase-admin';

type RateLimitHeaders = {
  daily_limit: number | null;
  daily_remaining: number | null;
  second_limit: number | null;
  second_remaining: number | null;
};

/**
 * ----------------------------------------------------------------------------------
 * HELPERS
 * ----------------------------------------------------------------------------------
 */

/**
 * Refresh Etsy access token using a stored refresh token.
 */
async function refreshEtsyToken(shopId: string): Promise<string | null> {
  console.log(`♻️ Refreshing Etsy token for shop ${shopId}...`);

  if (!adminDb) {
    console.error('Firebase Admin DB not initialized for token refresh.');
    return null;
  }

  const apiKeySnap = await adminDb
    .collection('etsy_api_keys')
    .doc(shopId)
    .get();

  if (!apiKeySnap.exists) {
    console.error(`API keys for shop ${shopId} not found.`);
    return null;
  }

  const { refresh_token } = apiKeySnap.data() as {
    refresh_token?: string;
  };

  if (!refresh_token) {
    console.error(`No refresh token found for shop ${shopId}.`);
    return null;
  }

  const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID;
  if (!ETSY_CLIENT_ID) {
    console.error('ETSY_CLIENT_ID environment variable is not set.');
    return null;
  }

  const tokenUrl = 'https://api.etsy.com/v3/public/oauth/token';
  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ETSY_CLIENT_ID,
      refresh_token,
    }),
  });

  if (!resp.ok) {
    console.error(
      `🔴 Failed to refresh Etsy token for shop ${shopId}: ${await resp.text()}`,
    );
    return null;
  }

  const json = (await resp.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + json.expires_in * 1000);
  console.log(`🕒 New token expires at: ${expiresAt.toISOString()}`);

  await adminDb
    .collection('etsy_api_keys')
    .doc(shopId)
    .update({
      access_token: json.access_token,
      refresh_token: json.refresh_token || refresh_token,
      expires_at: expiresAt,
      updated_at: new Date(),
    });

  console.log(`✅ Token refreshed & saved for shop ${shopId}.`);
  return json.access_token;
}

/**
 * Extract rate-limit headers from a Response object.
 */
function parseRateLimitHeaders(rsp: Response): RateLimitHeaders {
  const h = rsp.headers;
  const daily_limit = parseInt(h.get('x-limit-per-day') || '') || null;
  const daily_remaining = parseInt(h.get('x-remaining-today') || '') || null;
  const second_limit = parseInt(h.get('x-limit-per-second') || '') || null;
  const second_remaining = parseInt(h.get('x-remaining-this-second') || '') || null;

  return { daily_limit, daily_remaining, second_limit, second_remaining };
}

/**
 * ----------------------------------------------------------------------------------
 * HANDLER
 * ----------------------------------------------------------------------------------
 */

export async function GET() {
  try {
    initializeAdminApp();

    const userId = process.env.MOCK_USER_ID || 'local-user-123';

    /**
     * STEP 1 – Load active store record for this user
     * ------------------------------------------------------------------
     */
    if (!adminDb) throw new Error('Firebase not initialised');

    console.log(
      `Firebase bağlantısı mevcut, kullanıcı ${userId} için mağaza bilgileri alınıyor...`,
    );

    const storeSnap = await adminDb
      .collection('etsy_stores')
      .where('user_id', '==', userId)
      .get();

    // İndeks oluşturulana kadar JavaScript tarafında filtreleme yap
    const activeStores = storeSnap.docs.filter(doc => doc.data().is_active);

    if (activeStores.length === 0)
      return NextResponse.json({
        isConnected: false,
        error: 'Aktif mağaza bulunamadı',
      });

    const store = activeStores[0].data();
    const shopId = String(store.shop_id);
    const shopName = store.shop_name as string;

    /**
     * STEP 2 – Fetch API key + tokens
     * ------------------------------------------------------------------
     */
    const keyDoc = await adminDb.collection('etsy_api_keys').doc(shopId).get();
    if (!keyDoc.exists)
      return NextResponse.json({
        isConnected: false,
        store: { shop_id: Number(shopId), shop_name: shopName },
        error: 'API anahtarları bulunamadı',
      });

    const keyData = keyDoc.data() as {
      api_key: string;
      access_token?: string;
      expires_at?: any;
    };

    let accessToken = keyData.access_token;

    /**
     * STEP 3 – Proactive token refresh (1 h before expiry)
     * ------------------------------------------------------------------
     */
    if (keyData.expires_at) {
      const exp = keyData.expires_at.toDate
        ? keyData.expires_at.toDate()
        : new Date(keyData.expires_at);
      const diffMs = exp.getTime() - Date.now();
      const THRESHOLD = 60 * 60 * 1000; // 1 h
      console.log(`🕒 Token expires at: ${exp.toISOString()}`);
      console.log(`⏰ Time until expiry: ${Math.round(diffMs / 60000)} minutes`);
      if (diffMs < THRESHOLD) {
        const refreshed = await refreshEtsyToken(shopId);
        if (refreshed) accessToken = refreshed;
      }
    }

    /**
     * STEP 4 – Ping Etsy API (retry once on 401)
     * ------------------------------------------------------------------
     */
    const ping = async (token: string, retry = false): Promise<Response> => {
      const rsp = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${shopId}`,
        {
          headers: {
            'x-api-key': keyData.api_key,
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (rsp.status === 401 && !retry) {
        console.warn(`🔑 Token expired for shop ${shopId}. Refreshing...`);
        const newTok = await refreshEtsyToken(shopId);
        if (newTok) return ping(newTok, true);
      }

      return rsp;
    };

    const rsp = await ping(accessToken || '', false);
    if (!rsp.ok) {
      return NextResponse.json({
        isConnected: false,
        store: { shop_id: Number(shopId), shop_name: shopName },
        error: `Etsy API hatası: ${rsp.status}`,
      });
    }

    const shopData = await rsp.json();
    const rateHeaders = parseRateLimitHeaders(rsp);

    console.table({
      daily: `${rateHeaders.daily_remaining}/${rateHeaders.daily_limit}`,
      second: `${rateHeaders.second_remaining}/${rateHeaders.second_limit}`,
    });

    return NextResponse.json({
      isConnected: true,
      store: {
        shop_id: shopData.shop_id,
        shop_name: shopData.shop_name,
      },
      shopId,
      shopName,
      shopData,
      apiLimit: rateHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Unhandled error while checking Etsy connection:', msg);

    // İndeks hatası için özel mesaj
    const isIndexError = msg.includes('FAILED_PRECONDITION') && msg.includes('requires an index');
    
    return NextResponse.json({
      isConnected: false,
      error: isIndexError 
        ? 'Firebase indeksi oluşturulma sürecinde. Lütfen birkaç dakika bekleyin ve tekrar deneyin.'
        : 'Etsy bağlantısı kontrol edilirken bir hata oluştu.',
      details: msg
    }, { status: 500 });
  }
}