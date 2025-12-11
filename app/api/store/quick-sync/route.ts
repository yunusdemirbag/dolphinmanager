import { NextRequest, NextResponse } from 'next/server';
import { adminDb, initializeAdminApp } from '@/lib/firebase-admin';

const ETSY_API_URL = 'https://openapi.etsy.com/v3';

interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  state: string;
  user_id: number;
  shop_id: number;
  price: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  quantity: number;
  tags: string[];
  images: any[];
  variations: any[];
}

export async function POST(request: NextRequest) {
  try {
    const { shopId } = await request.json();
    
    if (!shopId) {
      return NextResponse.json({ error: 'ShopId gerekli' }, { status: 400 });
    }

    console.log(`🚀 Quick sync başlıyor - ShopId: ${shopId}`);
    
    initializeAdminApp();
    if (!adminDb) {
      throw new Error('Firebase Admin başlatılamadı');
    }

    // API token'ını al
    const apiKeysDoc = await adminDb.collection('etsy_api_keys').doc(shopId).get();
    
    if (!apiKeysDoc.exists) {
      return NextResponse.json({ error: 'API token bulunamadı' }, { status: 404 });
    }

    const { access_token } = apiKeysDoc.data()!;
    
    if (!access_token) {
      console.error('❌ Access token bulunamadı:', shopId);
      return NextResponse.json({ error: 'Access token bulunamadı' }, { status: 404 });
    }

    console.log(`🔑 Token bulundu, API çağrısı yapılıyor...`);

    // Etsy API'den son 12 ürünü çek
    const etsyResponse = await fetch(
      `${ETSY_API_URL}/application/shops/${shopId}/listings/active?limit=12&includes=Images`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'x-api-key': process.env.ETSY_API_KEY!,
        }
      }
    );

    if (!etsyResponse.ok) {
      const errorText = await etsyResponse.text();
      console.error('❌ Etsy API hatası:', {
        status: etsyResponse.status,
        statusText: etsyResponse.statusText,
        shopId,
        url: `${ETSY_API_URL}/application/shops/${shopId}/listings/active?limit=10&includes=Images`,
        response: errorText
      });
      
      return NextResponse.json({ 
        error: `Etsy API hatası (${etsyResponse.status}): ${errorText}`,
        details: {
          status: etsyResponse.status,
          shopId,
          message: errorText
        }
      }, { status: 500 });
    }

    const etsyData = await etsyResponse.json();
    const listings: EtsyListing[] = etsyData.results || [];

    console.log(`📦 ${listings.length} ürün Etsy'den alındı (Quick Sync)`);

    // Firebase'e kaydet
    let savedCount = 0;
    const batch = adminDb.batch();

    for (const listing of listings) {
      const productDoc = adminDb.collection('products').doc(listing.listing_id.toString());
      
      const productData = {
        ...listing,
        userId: 'local-user-123',
        synced_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      console.log(`💾 Kaydediliyor - Listing ID: ${listing.listing_id}, Shop ID: ${listing.shop_id}, Title: ${listing.title?.substring(0, 30)}`);
      
      batch.set(productDoc, productData, { merge: false });
      savedCount++;
    }

    await batch.commit();

    console.log(`✅ ${savedCount} ürün Firebase'e kaydedildi`);

    return NextResponse.json({
      success: true,
      message: `${savedCount} ürün başarıyla sync edildi`,
      productCount: savedCount,
      shopId
    });

  } catch (error) {
    console.error('❌ Quick sync hatası:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}