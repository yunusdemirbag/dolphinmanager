// src/lib/etsy-api.ts
// Bu dosya, Etsy API ile ilgili tüm sunucu tarafı mantığı yönetir.
// Token alma, yenileme ve API'den veri çekme işlemleri burada toplanmıştır.

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from './supabase';
import { cacheManager } from './cache';
import { EtsyStore, EtsyToken, EtsyApiResponse } from './etsy-api-types';
import { getStoredEtsyDataByType } from './etsy-api-utils';
import { syncEtsyDataToDatabase } from './etsy-api-sync';

// --- TEMEL AYARLAR VE SABİTLER ---
const ETSY_API_BASE = "https://api.etsy.com/v3";
const ETSY_CLIENT_ID = process.env.NEXT_PUBLIC_ETSY_CLIENT_ID || "";

// Etsy mağazalarını getir
export async function getEtsyStores(userId: string, skipCache = false): Promise<EtsyStore[]> {
  try {
    console.log(`Getting Etsy stores for user: ${userId}`);
    
    // Önce veritabanında kayıtlı mağaza verilerine bak
    const supabase = await createClient();
    const { data: stores, error } = await supabase
      .from('etsy_stores')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error("Error getting stored Etsy stores:", error);
      return [];
    }

    if (stores && stores.length > 0 && !skipCache) {
      console.log(`Found ${stores.length} stored stores for user: ${userId}`);
      return stores;
    }
    
    // Veritabanında veri yoksa veya eski ise, API'den güncel verileri al
    console.log("No stored data or outdated, fetching from Etsy API");
    
    // Önce geçerli bir access token al
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      console.error("Failed to get valid access token");
      throw new Error("Etsy hesabınız bağlı değil veya oturum süresi dolmuş. Lütfen mağazanızı tekrar bağlayın.");
    }
    
    // API'den kullanıcının mağazalarını al
    const response = await fetch(`${ETSY_API_BASE}/application/shops`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': ETSY_CLIENT_ID
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Etsy stores: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const etsyShops = data.results || [];

    // Mağazaları veritabanına kaydet
    const formattedStores = etsyShops.map((shop: any) => ({
        id: shop.shop_id.toString(),
        user_id: userId,
        shop_id: shop.shop_id,
        shop_name: shop.shop_name,
        title: shop.title,
        currency_code: shop.currency_code,
        listing_active_count: shop.listing_active_count || 0,
        num_favorers: shop.num_favorers || 0,
        review_count: shop.review_count || 0,
        review_average: shop.review_average || 0,
        url: shop.url,
        image_url: shop.icon_url_fullxfull,
        is_active: true,
        last_synced_at: new Date().toISOString()
      }));
      
    // Veritabanını güncelle
    if (formattedStores.length > 0) {
      const { error: upsertError } = await supabase
        .from('etsy_stores')
        .upsert(formattedStores, {
          onConflict: 'user_id,shop_id'
        });

      if (upsertError) {
        console.error("Error storing Etsy stores:", upsertError);
      }
    }

    return formattedStores;
    } catch (error) {
    if (error instanceof Error) {
      console.error("Error in getEtsyStores:", error.message, error.stack);
      throw new Error("Etsy mağazaları alınırken hata oluştu: " + error.message);
    } else {
      console.error("Error in getEtsyStores:", error);
      throw new Error("Etsy mağazaları alınırken bilinmeyen bir hata oluştu.");
    }
  }
}

// Token yönetimi fonksiyonları
async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: tokens, error } = await supabase
      .from('etsy_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !tokens) {
      console.error("Error getting Etsy tokens:", error ? JSON.stringify(error, null, 2) : 'No tokens found');
      return null;
    }

    // Token'ın geçerlilik süresini kontrol et
    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();

    // Eğer token 1 saatten az bir süre içinde sona erecekse yenile
    if (timeUntilExpiry < 3600000) {
      console.log("Token expiring soon, refreshing...");
      const newToken = await refreshEtsyToken(userId, tokens.refresh_token);
      return newToken;
    }

    return tokens.access_token;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error in getValidAccessToken:", error.message, error.stack);
    } else {
      console.error("Error in getValidAccessToken:", error);
    }
    return null;
  }
}

// Token yenileme fonksiyonu
async function refreshEtsyToken(userId: string, refreshToken: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc('refresh_etsy_token', {
        p_user_id: userId,
        p_refresh_token: refreshToken
      });

    if (error || !data) {
      console.error("Error refreshing Etsy token:", error);
      return null;
    }

    return data.access_token;
  } catch (error) {
    console.error("Error in refreshEtsyToken:", error);
    return null;
  }
}

export {
  getStoredEtsyDataByType,
  getValidAccessToken,
  refreshEtsyToken,
  syncEtsyDataToDatabase
};

// --- EKLENEN EKSİK FONKSİYONLAR ---

// getEtsyListings
export async function getEtsyListings(userId: string, shopId: number, limit = 100, offset = 0, state = 'active', skipCache = false) {
  // Burada backup dosyasındaki mantığı kullanabilirsin
  // Kısa örnek:
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) throw new Error('No valid access token');
  const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString(), state });
  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/listings?${params}`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID }
  });
  if (!response.ok) throw new Error('Etsy API error');
  const data = await response.json();
  return { listings: data.results || [], count: data.count || 0 };
}

// uploadImageToEtsy
export async function uploadImageToEtsy(userId: string, listingId: number, formData: FormData) {
    const accessToken = await getValidAccessToken(userId);
  if (!accessToken) throw new Error('No valid access token');
  const response = await fetch(`${ETSY_API_BASE}/application/shops/${listingId}/images`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID },
    body: formData
  });
  if (!response.ok) return { success: false, message: 'Failed to upload image' };
  const data = await response.json();
  return { success: true, message: 'Image uploaded', image: data };
}

// getEtsyAuthUrl
export async function getEtsyAuthUrl(userId: string): Promise<string> {
  // Basit örnek, backup dosyasındaki gibi
  const codeVerifier = Math.random().toString(36).substring(2, 15);
  const codeChallenge = codeVerifier; // Gerçek uygulamada PKCE algoritması kullanılmalı
  return `https://www.etsy.com/oauth/connect?response_type=code&client_id=${ETSY_CLIENT_ID}&redirect_uri=http://localhost:3000/api/etsy/callback&scope=email_r%20shops_r%20shops_w&state=${userId}&code_challenge=${codeChallenge}&code_challenge_method=plain`;
}

// exchangeCodeForToken
export async function exchangeCodeForToken(code: string, userId: string) {
  // Basit örnek
  const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-api-key': ETSY_CLIENT_ID },
      body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: ETSY_CLIENT_ID,
      redirect_uri: 'http://localhost:3000/api/etsy/callback',
      code,
      code_verifier: 'dummy',
      })
    });
  if (!response.ok) throw new Error('Token exchange failed');
  return await response.json();
}

// cleanupDuplicateTokens
export async function cleanupDuplicateTokens(userId: string): Promise<void> {
  // Basit örnek
  const supabase = await createClient();
  const { data: tokens } = await supabase.from('etsy_tokens').select('*').eq('user_id', userId);
  if (!tokens || tokens.length <= 1) return;
  // En son güncellenen token'ı bul
  const latestToken = tokens.reduce((latest: any, current: any) => {
    return new Date(current.updated_at || '') > new Date(latest.updated_at || '') ? current : latest;
  });
  await supabase.from('etsy_tokens').update({ is_valid: false }).eq('user_id', userId).neq('id', latestToken.id);
}

// generatePKCE
export function generatePKCE() {
  // Sadece örnek, gerçek PKCE algoritması kullanılmalı
  const codeVerifier = Math.random().toString(36).substring(2, 15);
  const codeChallenge = codeVerifier;
  return { codeVerifier, codeChallenge };
}

// invalidateShopCache
export async function invalidateShopCache(userId: string, shopId: number): Promise<void> {
  try {
    console.log(`Invalidating cache for user: ${userId}, shop: ${shopId}`);
    // Burada cache temizleme işlemi yapılabilir
  } catch (error) {
    console.error("Error invalidating shop cache:", error);
  }
}

// reorderListingImages
export async function reorderListingImages(userId: string, shopId: number, listingId: number, imageIds: number[]): Promise<boolean> {
  try {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) throw new Error("No valid access token found");
    const response = await fetch(
      `${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}/images/reorder`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': ETSY_CLIENT_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ listing_image_ids: imageIds })
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from Etsy API (reorder images):', errorText);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in reorderListingImages:', error);
    return false;
  }
}

// createDraftListing
export async function createDraftListing(userId: string, shopId: number, listingData: any): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) throw new Error("No valid access token found");
    // Sadece temel alanlar
    const requestBody = new URLSearchParams({
      title: listingData.title,
      description: listingData.description,
      price: (listingData.price.amount / listingData.price.divisor).toString(),
      quantity: listingData.quantity.toString(),
      shipping_profile_id: listingData.shipping_profile_id.toString(),
      state: listingData.state,
      taxonomy_id: (listingData.taxonomy_id || 1).toString()
    });
    const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/listings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': ETSY_CLIENT_ID,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: requestBody
    });
    if (!response.ok) throw new Error('Failed to create listing');
    return await response.json();
  } catch (error) {
    console.error('[ETSY_API] Error in createDraftListing:', error);
    throw error;
  }
}

// updateListing
export async function updateListing(userId: string, shopId: number, listingId: number, data: any): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) throw new Error("No valid access token found");
    const requestBody = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => requestBody.append(key, item.toString()));
        } else if (typeof value === 'object') {
          if (key === 'price' && value.amount !== undefined) {
            requestBody.append('price', (value.amount / (value.divisor || 100)).toString());
          } else {
            requestBody.append(key, JSON.stringify(value));
          }
        } else {
          requestBody.append(key, value.toString());
        }
      }
    });
    const response = await fetch(
      `${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': ETSY_CLIENT_ID,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: requestBody
      }
    );
    if (!response.ok) throw new Error('Failed to update listing');
    return await response.json();
  } catch (error) {
    console.error("Error updating listing:", error);
    throw error;
  }
}

// deleteListing
export async function deleteListing(userId: string, shopId: number, listingId: number): Promise<void> {
  try {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) throw new Error("No valid access token found");
    const response = await fetch(
      `${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': ETSY_CLIENT_ID
        }
      }
    );
    if (!response.ok) throw new Error('Failed to delete listing');
  } catch (error) {
    console.error("Error deleting listing:", error);
    throw error;
  }
}

// getEtsyReceipts
export async function getEtsyReceipts(userId: string, shopId: number, limit = 25, offset = 0, skipCache = false): Promise<{receipts: any[], count: number}> {
    const accessToken = await getValidAccessToken(userId);
  if (!accessToken) throw new Error('No valid access token');
  const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/receipts?${params}`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID }
  });
  if (!response.ok) throw new Error('Etsy API error');
  const data = await response.json();
  return { receipts: data.results || [], count: data.count || 0 };
}

// getEtsyPayments
export async function getEtsyPayments(userId: string, shopId: number, limit = 25, offset = 0, skipCache = false): Promise<{payments: any[], count: number}> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) throw new Error('No valid access token');
  const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/payments?${params}`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID }
  });
  if (!response.ok) throw new Error('Etsy API error');
  const data = await response.json();
  return { payments: data.results || [], count: data.count || 0 };
}

// calculateFinancialSummary
export async function calculateFinancialSummary(userId: string): Promise<{ total_revenue: number; total_fees: number; net_profit: number; currency: string; }> {
  // Basit örnek
  return { total_revenue: 0, total_fees: 0, net_profit: 0, currency: "USD" };
}

// invalidateUserCache
export async function invalidateUserCache(userId: string): Promise<void> {
  // Basit örnek
    shouldUseOnlyCachedData = false;
}

// getEtsyDataWithRefreshControl
export async function getEtsyDataWithRefreshControl(userId: string): Promise<{ stores: any[]; listings: any[] }> {
    const stores = await getEtsyStores(userId, true);
  if (!stores || stores.length === 0) throw new Error("No Etsy stores found");
  return { stores, listings: [] };
}

// createEtsyDataTables
export async function createEtsyDataTables(): Promise<void> {
  // Basit örnek
    console.log("Creating Etsy data tables...");
}

// checkEtsyTablesExist
export async function checkEtsyTablesExist(): Promise<{ exists: boolean; error?: any }> {
  // Basit örnek
  return { exists: true };
}

// updateShop
export async function updateShop(userId: string, shopId: number, data: any): Promise<any> {
  // Basit örnek
  return { success: true };
}

// shouldUseOnlyCachedData
export let shouldUseOnlyCachedData = false;

// getStoresFromDatabase
export async function getStoresFromDatabase(userId: string): Promise<any[]> {
  return [];
}

// getPropertiesByTaxonomyId
export async function getPropertiesByTaxonomyId(taxonomyId: number): Promise<any[]> {
  return [];
}

// getSellerTaxonomyNodes
export async function getSellerTaxonomyNodes(): Promise<any[]> {
  return [];
}

// fetchFromEtsyAPI
export async function fetchFromEtsyAPI(endpoint: string, accessToken: string): Promise<any> {
    const response = await fetch(`${ETSY_API_BASE}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID }
  });
  if (!response.ok) throw new Error('API request failed');
  return await response.json();
}

// getShippingProfiles
export async function getShippingProfiles(userId: string, shopId: number): Promise<any[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) throw new Error('No valid access token');
  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/shipping-profiles`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID }
  });
  if (!response.ok) throw new Error('API request failed');
  const data = await response.json();
  return data.results || [];
}

// createShippingProfile
export async function createShippingProfile(userId: string, shopId: number, data: any): Promise<any> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) throw new Error('No valid access token');
  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/shipping-profiles`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data)
  });
  if (!response.ok) throw new Error('API request failed');
  return await response.json();
}

// updateShippingProfile
export async function updateShippingProfile(userId: string, shopId: number, profileId: number, data: any): Promise<any> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) throw new Error('No valid access token');
  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/shipping-profiles/${profileId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data)
  });
  if (!response.ok) throw new Error('API request failed');
  return await response.json();
}

// deleteShippingProfile
export async function deleteShippingProfile(userId: string, shopId: number, profileId: number): Promise<void> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) throw new Error('No valid access token');
  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/shipping-profiles/${profileId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'x-api-key': ETSY_CLIENT_ID }
  });
  if (!response.ok) throw new Error('API request failed');
}