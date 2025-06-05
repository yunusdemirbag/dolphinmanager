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
  // Diğer fonksiyonlar da burada export edilmeli (örn: getEtsyAuthUrl, exchangeCodeForToken, cleanupDuplicateTokens, uploadImageToEtsy, vs.)
};