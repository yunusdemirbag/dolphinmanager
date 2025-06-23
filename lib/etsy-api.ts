import { adminDb, initializeAdminApp } from './firebase-admin';

async function refreshEtsyToken(shopId: string): Promise<string | null> {
    initializeAdminApp();
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
        // Here you might want to invalidate the store connection
        return null;
    }

    const newTokens = await response.json();
    const newAccessToken = newTokens.access_token;

    await adminDb.collection('etsy_api_keys').doc(shopId).update({
        access_token: newAccessToken,
        refresh_token: newTokens.refresh_token, // Etsy might send a new refresh token
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000),
        updated_at: new Date()
    });

    console.log(`✅ Successfully refreshed and saved new token for shop ${shopId}.`);
    return newAccessToken;
}


async function fetchFromEtsy(url: string, accessToken: string, apiKey: string, shopId: string, isRetry = false): Promise<{response: Response, newAccessToken?: string}> {
    let response = await fetch(url, {
        headers: {
            'x-api-key': apiKey,
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (response.status === 401 && !isRetry) {
        console.warn(`Token expired for shop ${shopId}. Attempting to refresh...`);
        const newAccessToken = await refreshEtsyToken(shopId);
        if (newAccessToken) {
            console.log("Retrying API call with new token...");
            const retryResult = await fetchFromEtsy(url, newAccessToken, apiKey, shopId, true);
            return { response: retryResult.response, newAccessToken };
        }
    }

    return { response };
}


async function fetchAllEtsyListings(shopId: string, apiKey: string, initialAccessToken: string) {
    let accessToken = initialAccessToken;
    const allProducts: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    console.log(`📦 Etsy API'den ürünler alınıyor - Shop ID: ${shopId}`);

    while (hasMore) {
        console.log(`Sayfa ${Math.floor(offset / limit) + 1}, offset ${offset} için istek gönderiliyor...`);
        const url = `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=${limit}&offset=${offset}&includes=images`;
        
        const { response, newAccessToken } = await fetchFromEtsy(url, accessToken, apiKey, shopId);
        
        // Token yenilendiyse güncel token'ı kullan
        if (newAccessToken) {
            accessToken = newAccessToken;
        }

        if (!response.ok) {
             const errorText = await response.text();
            console.error(`Etsy API error: ${response.status} - ${errorText}`);
            // If the error persists after a refresh attempt, we stop.
            throw new Error(`Etsy API error after potential refresh: ${response.status}`);
        }

        const data = await response.json();
        const products = data.results || [];
        
        if (products.length > 0) {
            // Her ürün için resim bilgilerini kontrol et
            for (const product of products) {
                if (!product.images || product.images.length === 0) {
                    console.log(`Ürün ${product.listing_id} için resim bilgisi alınıyor...`);
                    try {
                        const imagesUrl = `https://openapi.etsy.com/v3/application/listings/${product.listing_id}/images`;
                        const { response: imagesResponse, newAccessToken: newImageToken } = await fetchFromEtsy(imagesUrl, accessToken, apiKey, shopId);
                        
                        // Token yenilendiyse güncel token'ı kullan
                        if (newImageToken) {
                            accessToken = newImageToken;
                        }
                        
                        if (imagesResponse.ok) {
                            const imagesData = await imagesResponse.json();
                            product.images = imagesData.results || [];
                            console.log(`✅ Ürün ${product.listing_id} için ${product.images.length} resim alındı`);
                        } else {
                            console.error(`Ürün ${product.listing_id} için resim alınamadı: ${imagesResponse.status}`);
                        }
                    } catch (error) {
                        console.error(`Ürün ${product.listing_id} için resim alınırken hata: ${error}`);
                    }
                }
            }
            
            allProducts.push(...products);
        }
        
        console.log(`✅ Sayfa ${Math.floor(offset / limit) + 1}'den ${products.length} ürün alındı`);

        if (products.length < limit) {
            hasMore = false;
            console.log('Daha fazla ürün yok');
        } else {
            offset += limit;
        }
    }

    // You might want to fetch draft and inactive listings as well
    // For simplicity, we are only fetching active ones here.

    console.log(`✅ Toplam ${allProducts.length} Etsy ürünü başarıyla alındı`);
    return allProducts;
}

export { fetchAllEtsyListings, refreshEtsyToken }; 