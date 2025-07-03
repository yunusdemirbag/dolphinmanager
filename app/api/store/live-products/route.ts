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

    console.log(`🚀 Live products - ShopId: ${shopId}`);
    
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

    // Etsy API'den direkt son 12 ürünü çek
    const etsyResponse = await fetch(
      `${ETSY_API_URL}/application/shops/${shopId}/listings/active?limit=12&includes=Images,Videos`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'x-api-key': process.env.ETSY_API_KEY!,
        }
      }
    );

    console.log(`🔍 Etsy API response status: ${etsyResponse.status}`);

    if (!etsyResponse.ok) {
      const errorText = await etsyResponse.text();
      console.error('❌ Etsy API hatası:', {
        status: etsyResponse.status,
        statusText: etsyResponse.statusText,
        shopId,
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

    console.log(`📦 ${listings.length} ürün Etsy'den alındı (Live)`);
    console.log(`🔍 DEBUG - Shop ID: ${shopId}`);
    console.log(`🔍 DEBUG - API URL: ${ETSY_API_URL}/application/shops/${shopId}/listings/active?limit=12&includes=Images,Videos`);
    console.log(`🔍 DEBUG - Response data:`, etsyData);
    
    // TÜM ürünler için resimleri ayrı çek
    console.log(`🖼️ ${listings.length} ürün için resimler alınıyor...`);
    
    const productsWithImages = await Promise.all(
      listings.map(async (listing, index) => {
        try {
          console.log(`📸 Resim alınıyor ${index + 1}/${listings.length}: ${listing.listing_id}`);
          
          const imageResponse = await fetch(
            `${ETSY_API_URL}/application/shops/${shopId}/listings/${listing.listing_id}/images`,
            {
              headers: {
                'Authorization': `Bearer ${access_token}`,
                'x-api-key': process.env.ETSY_API_KEY!,
              }
            }
          );
          
          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            console.log(`✅ Resim başarılı ${listing.listing_id}: ${imageData.results?.length || 0} resim`);
            return {
              ...listing,
              images: imageData.results || []
            };
          } else {
            console.log(`⚠️ Resim alınamadı: ${listing.listing_id} - Status: ${imageResponse.status}`);
            return listing;
          }
        } catch (error) {
          console.log(`❌ Resim hatası: ${listing.listing_id}`, error);
          return listing;
        }
      })
    );
    
    const allProducts = productsWithImages;
    
    console.log(`🖼️ ${productsWithImages.length} ürün için resim alındı`);
    
    // Debug: İlk ürünün yapısını kontrol et
    if (allProducts.length > 0) {
      console.log('🔍 İlk ürün debug:', {
        listing_id: allProducts[0].listing_id,
        title: allProducts[0].title?.substring(0, 30),
        has_images: !!allProducts[0].images,
        images_count: allProducts[0].images?.length,
        image_sample: allProducts[0].images?.[0]
      });
    }

    return NextResponse.json({
      success: true,
      products: allProducts,
      productCount: allProducts.length,
      shopId,
      source: 'etsy_live'
    });

  } catch (error) {
    console.error('❌ Live products hatası:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}