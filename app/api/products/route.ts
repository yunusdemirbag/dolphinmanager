import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Etsy API'den gerçek ürünleri çek
    const shopId = process.env.ETSY_SHOP_ID || '12345678'; // Gerçek shop ID'nizi buraya ekleyin
    const apiUrl = `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'x-api-key': process.env.ETSY_API_KEY || '',
        'Authorization': `Bearer ${process.env.ETSY_ACCESS_TOKEN || ''}`
      }
    });

    if (!response.ok) {
      console.log(`Etsy API error: ${response.status}. Returning mock data for development.`);
      
      // Eğer API çağrısı başarısız olursa mock veri döndür
      return NextResponse.json({
        count: 3,
        results: [
          {
            id: '1001',
            title: 'Modern Minimalist Wall Art',
            description: 'Beautiful minimalist wall art for your home.',
            price: 29.99,
            currency_code: 'USD',
            quantity: 10,
            taxonomy_id: 1027, // Wall Decor
            tags: ['minimalist', 'wall art', 'home decor'],
            materials: ['canvas', 'wood'],
            images: [
              'https://i.etsystatic.com/sample/1.jpg',
              'https://i.etsystatic.com/sample/2.jpg'
            ],
            variations: [
              { size: 'Small', price: 29.99, quantity: 5, is_enabled: true },
              { size: 'Medium', price: 39.99, quantity: 3, is_enabled: true },
              { size: 'Large', price: 49.99, quantity: 2, is_enabled: true }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            state: 'active'
          },
          {
            id: '1002',
            title: 'Abstract Canvas Print',
            description: 'Colorful abstract art print on premium canvas.',
            price: 39.99,
            currency_code: 'USD',
            quantity: 8,
            taxonomy_id: 1027, // Wall Decor
            tags: ['abstract', 'canvas print', 'colorful'],
            materials: ['canvas', 'ink'],
            images: [
              'https://i.etsystatic.com/sample/3.jpg',
              'https://i.etsystatic.com/sample/4.jpg'
            ],
            variations: [
              { size: 'Small', price: 39.99, quantity: 4, is_enabled: true },
              { size: 'Large', price: 59.99, quantity: 4, is_enabled: true }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            state: 'active'
          },
          {
            id: '1003',
            title: 'Custom Family Portrait',
            description: 'Personalized digital family portrait illustration.',
            price: 49.99,
            currency_code: 'USD',
            quantity: 999,
            taxonomy_id: 2078, // Digital Prints
            tags: ['portrait', 'custom', 'family', 'digital'],
            materials: ['digital file'],
            images: [
              'https://i.etsystatic.com/sample/5.jpg',
              'https://i.etsystatic.com/sample/6.jpg'
            ],
            variations: [
              { style: 'Cartoon', price: 49.99, quantity: 999, is_enabled: true },
              { style: 'Realistic', price: 69.99, quantity: 999, is_enabled: true }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            state: 'active'
          }
        ]
      });
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
              'x-api-key': process.env.ETSY_API_KEY || '',
              'Authorization': `Bearer ${process.env.ETSY_ACCESS_TOKEN || ''}`
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
              'x-api-key': process.env.ETSY_API_KEY || '',
              'Authorization': `Bearer ${process.env.ETSY_ACCESS_TOKEN || ''}`
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
    
    // Hata durumunda da mock veri döndür
    return NextResponse.json({
      count: 3,
      results: [
        {
          id: '1001',
          title: 'Modern Minimalist Wall Art',
          description: 'Beautiful minimalist wall art for your home.',
          price: 29.99,
          currency_code: 'USD',
          quantity: 10,
          taxonomy_id: 1027, // Wall Decor
          tags: ['minimalist', 'wall art', 'home decor'],
          materials: ['canvas', 'wood'],
          images: [
            'https://i.etsystatic.com/sample/1.jpg',
            'https://i.etsystatic.com/sample/2.jpg'
          ],
          variations: [
            { size: 'Small', price: 29.99, quantity: 5, is_enabled: true },
            { size: 'Medium', price: 39.99, quantity: 3, is_enabled: true },
            { size: 'Large', price: 49.99, quantity: 2, is_enabled: true }
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          state: 'active'
        },
        {
          id: '1002',
          title: 'Abstract Canvas Print',
          description: 'Colorful abstract art print on premium canvas.',
          price: 39.99,
          currency_code: 'USD',
          quantity: 8,
          taxonomy_id: 1027, // Wall Decor
          tags: ['abstract', 'canvas print', 'colorful'],
          materials: ['canvas', 'ink'],
          images: [
            'https://i.etsystatic.com/sample/3.jpg',
            'https://i.etsystatic.com/sample/4.jpg'
          ],
          variations: [
            { size: 'Small', price: 39.99, quantity: 4, is_enabled: true },
            { size: 'Large', price: 59.99, quantity: 4, is_enabled: true }
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          state: 'active'
        },
        {
          id: '1003',
          title: 'Custom Family Portrait',
          description: 'Personalized digital family portrait illustration.',
          price: 49.99,
          currency_code: 'USD',
          quantity: 999,
          taxonomy_id: 2078, // Digital Prints
          tags: ['portrait', 'custom', 'family', 'digital'],
          materials: ['digital file'],
          images: [
            'https://i.etsystatic.com/sample/5.jpg',
            'https://i.etsystatic.com/sample/6.jpg'
          ],
          variations: [
            { style: 'Cartoon', price: 49.99, quantity: 999, is_enabled: true },
            { style: 'Realistic', price: 69.99, quantity: 999, is_enabled: true }
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          state: 'active'
        }
      ]
    });
  }
} 