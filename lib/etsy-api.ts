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
                            console.log(`✅ Ürün ${product.listing_id} için ${(product.images || []).length} resim alındı`);
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

/**
 * Fetch shipping profiles from Etsy API
 */
export async function fetchEtsyShippingProfiles(shopId: string, apiKey: string, accessToken: string): Promise<any[]> {
    try {
        console.log(`📦 Fetching shipping profiles for shop ${shopId}...`);
        
        const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/shipping-profiles`, {
            headers: {
                'x-api-key': apiKey,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.log('Token expired, attempting to refresh...');
                const newToken = await refreshEtsyToken(shopId);
                if (newToken) {
                    const retryResponse = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/shipping-profiles`, {
                        headers: {
                            'x-api-key': apiKey,
                            'Authorization': `Bearer ${newToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (retryResponse.ok) {
                        const data = await retryResponse.json();
                        console.log(`✅ ${data.results?.length || 0} shipping profiles fetched successfully after token refresh`);
                        return data.results || [];
                    }
                }
            }
            console.error(`Failed to fetch shipping profiles: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        console.log(`✅ ${data.results?.length || 0} shipping profiles fetched successfully`);
        return data.results || [];
    } catch (error) {
        console.error('Error fetching shipping profiles:', error);
        return [];
    }
}

/**
 * Fetch shop sections from Etsy API
 */
export async function fetchEtsyShopSections(shopId: string, apiKey: string, accessToken: string): Promise<any[]> {
    try {
        console.log(`📂 Fetching shop sections for shop ${shopId}...`);
        
        const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/sections`, {
            headers: {
                'x-api-key': apiKey,
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.log('Token expired, attempting to refresh...');
                const newToken = await refreshEtsyToken(shopId);
                if (newToken) {
                    const retryResponse = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/sections`, {
                        headers: {
                            'x-api-key': apiKey,
                            'Authorization': `Bearer ${newToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (retryResponse.ok) {
                        const data = await retryResponse.json();
                        console.log(`✅ ${data.results?.length || 0} shop sections fetched successfully after token refresh`);
                        return data.results || [];
                    }
                }
            }
            console.error(`Failed to fetch shop sections: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        console.log(`✅ ${data.results?.length || 0} shop sections fetched successfully`);
        return data.results || [];
    } catch (error) {
        console.error('Error fetching shop sections:', error);
        return [];
    }
}

/**
 * Adds inventory with variations to an Etsy listing
 * Creates all possible size x pattern combinations (48 variations)
 */
async function addInventoryWithVariations(accessToken: string, listingId: number, variations: any[], readinessStateId?: number) {
    const ETSY_API_BASE = 'https://openapi.etsy.com/v3';
    const ETSY_CLIENT_ID = process.env.ETSY_CLIENT_ID;
    
    console.log(`🎯 Adding inventory with variations for listing ${listingId}`);
    console.log(`📊 Input variations: ${variations.length}`);
    
    try {
        // Extract unique sizes from variations
        const sizes = [...new Set(variations.map((v: any) => v.size))];
        console.log(`📏 Unique sizes found: ${sizes.length}`, sizes);
        
        // Extract unique patterns from variations dynamically
        const patterns = [...new Set(variations.map((v: any) => v.pattern))];
        console.log(`🎨 Patterns extracted from variations: ${patterns.length}`, patterns);
        
        const allVariations = [];
        
        // Create all size x pattern combinations
        for (const size of sizes) {
            for (const pattern of patterns) {
                // Find matching variation from input
                const existingVariation = variations.find((v: any) => 
                    v.size === size && v.pattern === pattern
                );
                
                const price = existingVariation?.price || 0;
                const isEnabled = existingVariation?.is_active || false;
                
                // Validate price - Etsy minimum 0.20 USD, maximum 50000 USD
                // If price is 0 or negative, set minimum price but mark as disabled
                let finalPrice = price;
                let finalEnabled = isEnabled;
                
                if (price <= 0) {
                    finalPrice = 0.2; // Set minimum Etsy price
                    finalEnabled = false; // Mark as disabled
                } else {
                    finalPrice = Math.min(Math.max(price, 0.2), 50000);
                }
                
                allVariations.push({
                    property_values: [
                        {
                            property_id: 513,
                            property_name: "Size",
                            values: [size]
                        },
                        {
                            property_id: 514,
                            property_name: "Pattern",
                            values: [pattern]
                        }
                    ],
                    offerings: [
                        {
                            price: finalPrice,
                            quantity: 4,
                            is_enabled: finalEnabled,
                            ...(readinessStateId ? { readiness_state_id: readinessStateId } : {})
                        }
                    ]
                });
            }
        }
        
        console.log(`✨ Generated ${allVariations.length} total variations (${sizes.length} sizes × ${patterns.length} patterns)`);
        
        // Send to Etsy API
        const response = await fetch(`${ETSY_API_BASE}/application/listings/${listingId}/inventory`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'x-api-key': ETSY_CLIENT_ID!,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                products: allVariations,
                price_on_property: [513, 514], // Enable "Prices vary for each Size and Pattern"
                quantity_on_property: [],
                sku_on_property: [],
                legacy: false // Yeni Processing Profiles API'sini kullan
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Etsy inventory API error:', response.status, errorText);
            throw new Error(`Etsy inventory API error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Inventory with variations added successfully');
        console.log('📊 Result summary:', {
            products_count: result.products?.length || 0,
            price_on_property: result.price_on_property
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ Error adding inventory with variations:', error);
        throw error;
    }
}

export { fetchAllEtsyListings, refreshEtsyToken, addInventoryWithVariations };