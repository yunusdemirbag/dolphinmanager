import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';
import { addInventoryWithVariations, fetchAllEtsyListings, refreshEtsyToken } from '@/lib/etsy-api';
import { predefinedVariations } from '@/lib/etsy-variation-presets';

/**
 * Bu API endpoint'i, mağazadaki tüm Etsy ürünlerinin ölçülerini ve fiyatlarını güncellemek için kullanılır.
 * Tüm ölçüleri ve fiyatları güncelleyerek eski listeleri yeni fiyat ve ölçülerle günceller.
 * İlerleme durumu ve detaylı bilgi gösterimi sunar.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Eski listeleri güncelleme işlemi başlatıldı');
    initializeAdminApp();

    // İstek gövdesinden ürün ID'lerini al (belirli ürünleri güncellemek için)
    const requestData = await request.json().catch(() => ({}));
    const specificProductIds = requestData.productIds || [];
    
    // Kullanıcı kimliğini al (gerçek uygulamada auth sisteminden gelecek)
    const userId = 'local-user-123'; // Bu değer gerçek uygulamada auth sisteminden gelecek

    // Etsy API bilgilerini al
    const storeResponse = await fetch('/api/etsy/status');
    if (!storeResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Etsy mağaza bilgileri alınamadı'
      }, { status: 500 });
    }
    
    const storeData = await storeResponse.json();
    const shopId = storeData.shopId || storeData.store?.shop_id;
    
    if (!shopId) {
      return NextResponse.json({
        success: false,
        error: 'Etsy mağaza ID bulunamadı'
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
    
    const apiKeyDoc = await adminDb.collection('etsy_api_keys').doc(shopId).get();
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
    const refreshedToken = await refreshEtsyToken(shopId);
    const currentToken = refreshedToken || accessToken;

    if (!currentToken) {
      return NextResponse.json({
        success: false,
        error: 'Etsy token alınamadı'
      }, { status: 401 });
    }

    // Etsy'den aktif ürünleri al
    const listings = await fetchAllEtsyListings(shopId, apiKey, currentToken);
    console.log(`📋 Toplam ${listings.length} ürün bulundu`);
    
    // Belirli ürünler seçildiyse, sadece onları güncelle
    const listingsToUpdate = specificProductIds.length > 0
      ? listings.filter((listing: any) => specificProductIds.includes(listing.listing_id.toString()))
      : listings;
      
    console.log(`🔄 ${specificProductIds.length > 0 ? 'Seçili' : 'Tüm'} ürünler güncelleniyor: ${listingsToUpdate.length} ürün`);

    // Güncelleme sonuçlarını takip etmek için
    const results = {
      total: listings.length,
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      updatedListings: [] as {
        id: string | number,
        title: string,
        oldVariations: any[],
        newVariations: any[]
      }[]
    };

    // Tüm güncel varyasyonları kullan
    console.log(`📋 Toplam ${predefinedVariations.length} varyasyon kullanılacak`);

    // Her ürün için varyasyonları güncelle
    for (const listing of listingsToUpdate) {
      try {
        const listingId = listing.listing_id;
        console.log(`🔄 Ürün güncelleniyor: ${listingId} - ${listing.title}`);

        // Ürünün mevcut varyasyonlarını al
        // Not: Bu örnekte, mevcut varyasyonları doğrudan alamıyoruz, bu yüzden predefinedVariations kullanıyoruz
        // Gerçek uygulamada, Etsy API'den mevcut varyasyonları almanız gerekebilir
        
        // Mevcut varyasyonları kaydet (son 10 ürün için)
        const oldVariations = listingsToUpdate.length - results.updated <= 10 ?
          [...predefinedVariations] : [];
        
        // Güncel varyasyonları kullan
        const updatedVariations = predefinedVariations;
        
        // Varyasyonları güncelle
        await addInventoryWithVariations(currentToken, listingId, updatedVariations);
        
        console.log(`✅ Ürün başarıyla güncellendi: ${listingId}`);
        results.updated++;
        
        // Son 10 ürün için değişiklik detaylarını kaydet
        if (listingsToUpdate.length - results.updated <= 10) {
          results.updatedListings.push({
            id: listingId,
            title: listing.title,
            oldVariations: oldVariations,
            newVariations: updatedVariations
          });
        }
        
        // Firebase'e güncelleme kaydı ekle
        if (adminDb) {
          await adminDb.collection('etsy_listings').doc(listingId.toString()).update({
            variations_updated: true,
            variations_updated_at: new Date(),
            variations_count: updatedVariations.length,
            price_updated: true,
            price_updated_at: new Date()
          }).catch(err => console.error(`❌ Güncelleme kaydı eklenirken hata: ${err}`));
        }
        
        // Rate limit aşımını önlemek için kısa bir bekleme
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`❌ Ürün güncellenirken hata: ${listing.listing_id}`, error);
        results.failed++;
        results.errors.push(`Ürün ${listing.listing_id}: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      }
    }

    // İşlem süresini hesapla
    results.endTime = Date.now();
    results.duration = (results.endTime - results.startTime) / 1000; // saniye cinsinden
    
    console.log('🏁 Güncelleme işlemi tamamlandı', {
      total: results.total,
      updated: results.updated,
      failed: results.failed,
      duration: `${results.duration.toFixed(2)} saniye`
    });
    
    return NextResponse.json({
      success: true,
      results: {
        total: results.total,
        updated: results.updated,
        failed: results.failed,
        skipped: results.skipped,
        errors: results.errors,
        duration: results.duration,
        updatedListings: results.updatedListings,
        estimatedTimePerItem: results.updated > 0 ? results.duration / results.updated : 0
      }
    });
    
  } catch (error) {
    console.error('❌ Güncelleme işlemi sırasında hata:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
    }, { status: 500 });
  }
}