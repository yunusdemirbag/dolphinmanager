import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    let shopId = process.env.ETSY_SHOP_ID;
    let apiKey = process.env.ETSY_API_KEY;
    let accessToken = process.env.ETSY_ACCESS_TOKEN;
    
    // Firebase bağlantısı varsa, oradan API bilgilerini çek
    if (adminDb) {
      try {
        // En son eklenen mağaza bilgilerini al
        const storesRef = adminDb.collection('etsy_stores');
        const storeSnapshot = await storesRef.orderBy('connected_at', 'desc').limit(1).get();
        
        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data();
          shopId = storeData?.shop_id?.toString();
          
          // API anahtarlarını al
          const apiKeysRef = adminDb.collection('etsy_api_keys');
          const apiSnapshot = await apiKeysRef.orderBy('updated_at', 'desc').limit(1).get();
          
          if (!apiSnapshot.empty) {
            const apiData = apiSnapshot.docs[0].data();
            apiKey = apiData?.api_key || apiKey;
            accessToken = apiData?.access_token || accessToken;
          }
        }
      } catch (dbError) {
        console.error('Firebase bağlantı hatası:', dbError);
      }
    }

    if (!shopId || !apiKey || !accessToken) {
      console.error('Etsy API kimlik bilgileri bulunamadı.');
      return NextResponse.json({ 
        error: 'Etsy API kimlik bilgileri bulunamadı. Lütfen Etsy mağazanızı bağlayın.'
      }, { status: 500 });
    }
  
    const apiUrl = `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Etsy API error:', errorBody);
      return NextResponse.json({ 
        error: 'Failed to fetch products from Etsy API',
        message: `Etsy API error: ${response.status}`
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Ürün detaylarını zenginleştir
    const enrichedProducts = await Promise.all(
      data.results.map(async (product: any) => {
        // Her ürün için görüntüleri al
        const imagesResponse = await fetch(
          `https://openapi.etsy.com/v3/application/listings/${product.listing_id}/images`,
          {
            headers: {
              'x-api-key': apiKey,
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        let images = [];
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          images = imagesData.results.map((img: any) => img.url_fullxfull);
        }

        // Her ürün için varyasyonları al
        const inventoryResponse = await fetch(
          `https://openapi.etsy.com/v3/application/listings/${product.listing_id}/inventory`,
          {
            headers: {
              'x-api-key': apiKey,
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        let variations = [];
        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json();
          variations = inventoryData.products.map((variant: any) => {
            const properties = variant.property_values.reduce((acc: any, prop: any) => {
              acc[prop.property_name.toLowerCase()] = prop.values[0];
              return acc;
            }, {});

            return {
              ...properties,
              price: variant.offerings[0]?.price?.amount / variant.offerings[0]?.price?.divisor || product.price.amount / product.price.divisor,
              quantity: variant.offerings[0]?.quantity || product.quantity,
              is_enabled: variant.is_enabled
            };
          });
        }

        return {
          id: product.listing_id,
          title: product.title,
          description: product.description,
          price: product.price.amount / product.price.divisor,
          currency_code: product.price.currency_code,
          quantity: product.quantity,
          taxonomy_id: product.taxonomy_id,
          tags: product.tags,
          materials: product.materials,
          images,
          variations,
          created_at: product.creation_timestamp,
          updated_at: product.last_modified_timestamp,
          state: product.state
        };
      })
    );

    return NextResponse.json({
      count: data.count,
      results: enrichedProducts
    });
  } catch (error) {
    console.error('Error fetching products from Etsy API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch products from Etsy API',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 