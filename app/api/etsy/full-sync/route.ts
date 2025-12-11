import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';
import { fetchAllEtsyListings, refreshEtsyToken } from '@/lib/etsy-api';

/**
 * Bu API endpoint'i, mağazadaki tüm Etsy ürünlerini çekmek ve önbelleğe kaydetmek için kullanılır.
 * Büyük veri setlerini hızlı bir şekilde yüklemek için tarayıcı tabanlı önbellek sistemi kullanır.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Full sync başlatıldı');
    initializeAdminApp();

    // İstek gövdesinden mağaza ID'sini al
    const requestData = await request.json().catch(() => ({}));
    const shopId = requestData.shopId;
    
    if (!shopId) {
      return NextResponse.json({
        success: false,
        error: 'Mağaza ID belirtilmedi'
      }, { status: 400 });
    }

    // API anahtarlarını al
    if (!adminDb) {
      console.error("Firebase Admin DB not initialized");
      return NextResponse.json({
        success: false,
        error: 'Firebase bağlantısı kurulamadı'
      }, { status: 500 });
    }
    
    const apiKeyDoc = await adminDb.collection('etsy_api_keys').doc(shopId.toString()).get();
    if (!apiKeyDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Etsy API anahtarları bulunamadı'
      }, { status: 400 });
    }

    const apiKeyData = apiKeyDoc.data()!;
    const accessToken = apiKeyData.access_token;
    const apiKey = process.env.ETSY_CLIENT_ID!;

    // Token'ı yenile
    const refreshedToken = await refreshEtsyToken(shopId.toString());
    const currentToken = refreshedToken || accessToken;

    if (!currentToken) {
      return NextResponse.json({
        success: false,
        error: 'Etsy token alınamadı'
      }, { status: 401 });
    }

    // İşlem başlangıç zamanı
    const startTime = Date.now();

    // Etsy'den tüm ürünleri al
    console.log(`🔍 Etsy'den tüm ürünler alınıyor (Shop ID: ${shopId})...`);
    const listings = await fetchAllEtsyListings(shopId.toString(), apiKey, currentToken);
    console.log(`📋 Toplam ${listings.length} ürün bulundu`);

    // İşlem bitiş zamanı
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // saniye cinsinden

    // Sonuçları hazırla
    const results = {
      total: listings.length,
      products: listings,
      duration,
      timestamp: new Date().toISOString()
    };

    console.log('🏁 Full sync tamamlandı', {
      total: results.total,
      duration: `${results.duration.toFixed(2)} saniye`
    });
    
    return NextResponse.json({
      success: true,
      results
    });
    
  } catch (error) {
    console.error('❌ Full sync sırasında hata:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
    }, { status: 500 });
  }
}