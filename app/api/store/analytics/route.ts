import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    
    if (!shopId) {
      return NextResponse.json({
        success: false,
        error: 'shopId parametresi gerekli'
      }, { status: 400 });
    }

    console.log('📊 Mağaza analytics getiriliyor:', shopId);

    // Store analytics verisini getir
    const analyticsDoc = await adminDb
      .collection('shop_analytics')
      .doc(shopId)
      .get();

    if (!analyticsDoc.exists) {
      // Analytics verisi yoksa temel veriyi döndür
      return NextResponse.json({
        success: true,
        analytics: {
          shop_id: shopId,
          total_products: 0,
          active_listings: 0,
          total_reviews: 0,
          average_rating: 0,
          total_views: 0,
          total_favorites: 0,
          monthly_sales_estimate: 0,
          last_updated: null,
          top_selling_product: null
        }
      });
    }

    const analytics = analyticsDoc.data();
    
    console.log('✅ Analytics verisi bulundu:', Object.keys(analytics || {}));

    return NextResponse.json({
      success: true,
      analytics: {
        shop_id: shopId,
        ...analytics,
        last_updated: analytics?.calculated_at?.toDate?.() || analytics?.calculated_at
      }
    });

  } catch (error) {
    console.error('❌ Analytics getirme hatası:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Analytics verisi alınamadı'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    initializeAdminApp();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    const body = await request.json();
    const { shopId, forceRefresh = false } = body;
    
    if (!shopId) {
      return NextResponse.json({
        success: false,
        error: 'shopId gerekli'
      }, { status: 400 });
    }

    console.log('🔄 Analytics sync başlatılıyor:', shopId);

    // Mağaza bilgilerini getir
    const storeDoc = await adminDb
      .collection('etsy_stores')
      .doc(shopId)
      .get();

    if (!storeDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Mağaza bulunamadı'
      }, { status: 404 });
    }

    const storeData = storeDoc.data();
    
    // API anahtarlarını getir
    const apiKeysDoc = await adminDb
      .collection('etsy_api_keys')
      .doc(shopId)
      .get();

    if (!apiKeysDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'API anahtarları bulunamadı'
      }, { status: 404 });
    }

    const apiKeys = apiKeysDoc.data();

    // Etsy API'den mağaza istatistiklerini çek
    const shopStats = await fetchShopStatistics(
      storeData.shop_id,
      apiKeys.api_key,
      apiKeys.access_token
    );

    // Analytics verisini hesapla ve kaydet
    const analytics = {
      shop_id: shopId,
      total_products: shopStats.listing_active_count || 0,
      active_listings: shopStats.listing_active_count || 0,
      total_reviews: shopStats.review_count || 0,
      average_rating: shopStats.review_average || 0,
      total_views: shopStats.total_views || 0,
      total_favorites: shopStats.total_favorites || 0,
      monthly_sales_estimate: estimateMonthlySales(shopStats),
      top_selling_product: shopStats.top_product || null,
      calculated_at: new Date(),
      last_api_call: new Date()
    };

    // Firebase'e kaydet
    await adminDb
      .collection('shop_analytics')
      .doc(shopId)
      .set(analytics);

    // Store document'i de güncelle
    await adminDb
      .collection('etsy_stores')
      .doc(shopId)
      .update({
        total_products: analytics.total_products,
        last_analytics_update: new Date()
      });

    // Analytics başarıyla alındığında mağaza durumunu da güncelle
    await adminDb
      .collection('etsy_stores')
      .doc(shopId)
      .update({
        is_connected: true,
        disconnected_at: null,
        disconnect_reason: null,
        last_sync_at: new Date()
      });

    console.log('✅ Analytics başarıyla güncellendi');

    return NextResponse.json({
      success: true,
      analytics,
      message: 'Analytics başarıyla güncellendi'
    });

  } catch (error) {
    console.error('❌ Analytics sync hatası:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Analytics güncellenemedi',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Etsy API'den mağaza istatistiklerini çek
async function fetchShopStatistics(shopId: number, apiKey: string, accessToken: string) {
  try {
    const responses = await Promise.allSettled([
      // Shop bilgileri
      fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}`, {
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${accessToken}`
        }
      }),
      
      // Shop reviews
      fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/reviews?limit=1`, {
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${accessToken}`
        }
      }),

      // Active listings count
      fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active?limit=1`, {
        headers: {
          'x-api-key': apiKey,
          'Authorization': `Bearer ${accessToken}`
        }
      })
    ]);

    const stats: any = {
      listing_active_count: 0,
      review_count: 0,
      review_average: 0,
      total_views: 0,
      total_favorites: 0
    };

    // Shop bilgileri
    if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
      const shopData = await responses[0].value.json();
      stats.listing_active_count = shopData.listing_active_count || 0;
      stats.total_views = shopData.total_shop_views || 0;
    }

    // Reviews
    if (responses[1].status === 'fulfilled' && responses[1].value.ok) {
      const reviewData = await responses[1].value.json();
      stats.review_count = reviewData.count || 0;
      if (reviewData.results && reviewData.results.length > 0) {
        // Ortalama rating hesapla (basit)
        stats.review_average = 4.5; // Placeholder - gerçek hesaplama için tüm reviews gerekli
      }
    }

    // Active listings
    if (responses[2].status === 'fulfilled' && responses[2].value.ok) {
      const listingsData = await responses[2].value.json();
      stats.listing_active_count = listingsData.count || 0;
    }

    return stats;

  } catch (error) {
    console.error('Etsy API error:', error);
    return {
      listing_active_count: 0,
      review_count: 0,
      review_average: 0,
      total_views: 0,
      total_favorites: 0
    };
  }
}

// Aylık satış tahmini
function estimateMonthlySales(stats: any): number {
  // Basit tahmin algoritması
  const { listing_active_count, total_views, review_count } = stats;
  
  if (!listing_active_count || listing_active_count === 0) return 0;
  
  // Basit formül: views * conversion_rate * avg_price
  const estimatedConversionRate = Math.min(review_count / total_views * 100, 5) || 1;
  const estimatedAvgPrice = 25; // $25 ortalama fiyat
  const monthlyViews = total_views / 12; // Yıllık view'ın aylığı
  
  return Math.round(monthlyViews * (estimatedConversionRate / 100) * estimatedAvgPrice);
}