import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Etsy ürün tipi tanımı
interface EtsyProduct {
  listing_id: number;
  user_id: number;
  shop_id: number;
  title: string;
  description: string;
  state: string;
  creation_timestamp: number;
  created_timestamp: number;
  ending_timestamp: number;
  original_creation_timestamp: number;
  last_modified_timestamp: number;
  updated_timestamp: number;
  state_timestamp: number;
  quantity: number;
  shop_section_id: number;
  featured_rank: number;
  url: string;
  num_favorers: number;
  tags: string[];
  price: {
    amount: number;
    divisor: number;
    currency_code: string;
  };
  taxonomy_id: number;
  views: number;
  images: Array<{
    listing_id?: number;
    listing_image_id?: number;
    hex_code?: string;
    red?: number;
    green?: number;
    blue?: number;
    hue?: number;
    saturation?: number;
    brightness?: number;
    is_black_and_white?: boolean;
    creation_tsz?: number;
    created_timestamp?: number;
    rank?: number;
    url_75x75?: string;
    url_170x135?: string;
    url_570xN?: string;
    url_fullxfull?: string;
    full_height?: number;
    full_width?: number;
    alt_text?: string;
  }>;
}

export async function GET() {
  try {
    let shopId = process.env.ETSY_SHOP_ID;
    let apiKey = process.env.ETSY_API_KEY;
    let accessToken = process.env.ETSY_ACCESS_TOKEN;
    
    // Firebase bağlantısı varsa, oradan API bilgilerini çek
    if (adminDb) {
      try {
        // En son bağlanan mağaza bilgilerini al
        const storesRef = adminDb.collection('etsy_stores');
        const storeSnapshot = await storesRef.orderBy('connected_at', 'desc').limit(1).get();
        
        if (!storeSnapshot.empty) {
          const storeData = storeSnapshot.docs[0].data();
          shopId = storeData?.shop_id?.toString();
          
          // Mağaza ID'sine göre API anahtarlarını al
          if (shopId) {
            const apiKeyRef = adminDb.collection('etsy_api_keys').doc(shopId);
            const apiKeyDoc = await apiKeyRef.get();
            
            if (apiKeyDoc.exists) {
              const apiKeyData = apiKeyDoc.data();
              apiKey = apiKeyData?.api_key;
              accessToken = apiKeyData?.access_token;
            }
          }
        }
      } catch (error) {
        console.error('Firebase\'den API bilgileri alınamadı:', error);
      }
    }
    
    // Etsy API'ye istek gönder
    if (!apiKey || !accessToken || !shopId) {
      // Yerel geliştirme ortamında mock API'ye yönlendir
      if (process.env.NODE_ENV === 'development') {
        console.log('Etsy API kimlik bilgileri bulunamadı. Mock API kullanılıyor...');
        const mockResponse = await fetch(new URL('/api/products/mock', new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')).toString());
        if (mockResponse.ok) {
          return mockResponse;
        }
      }
      
      return NextResponse.json({ 
        error: 'Etsy API kimlik bilgileri bulunamadı',
        products: []
      }, { status: 401 });
    }
    
    // Shop ID'yi integer'a dönüştür
    const shopIdInt = parseInt(shopId, 10);
    if (isNaN(shopIdInt)) {
      return NextResponse.json({ 
        error: 'Geçersiz mağaza ID formatı',
        products: []
      }, { status: 400 });
    }

    console.log(`📦 Etsy API'den ürünler alınıyor - Shop ID: ${shopIdInt}`);
    
    // Tüm ürünleri çekmek için sayfalama kullanacağız
    const allProducts: EtsyProduct[] = [];
    let page = 1;
    let limit = 100; // Etsy API'nin bir seferde izin verdiği maksimum ürün sayısı
    let hasMore = true;
    
    // Aktif ürünleri çekelim
    while (hasMore) {
      try {
        const offset = (page - 1) * limit;
        
        console.log(`Sayfa ${page}, offset ${offset} için istek gönderiliyor...`);
        
        const response = await fetch(
          `https://openapi.etsy.com/v3/application/shops/${shopIdInt}/listings/active?limit=${limit}&offset=${offset}&includes=Images,Tags`,
          {
            headers: {
              'x-api-key': apiKey,
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (!response.ok) {
          console.error(`Etsy API hatası: ${response.status}`);
          
          // Yerel geliştirme ortamında API hatası olursa mock API'ye yönlendir
          if (process.env.NODE_ENV === 'development' && allProducts.length === 0) {
            console.log(`Etsy API hatası: ${response.status}. Mock API kullanılıyor...`);
            const mockResponse = await fetch(new URL('/api/products/mock', new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')).toString());
            if (mockResponse.ok) {
              return mockResponse;
            }
          }
          
          // Rate limit aşıldıysa bekleyelim
          if (response.status === 429) {
            console.log("Rate limit aşıldı, 2 saniye bekleniyor...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Birkaç denemeden sonra hala başarısız olursa, devam etmeyi bırak
            if (page > 3) {
              hasMore = false;
              console.log("Çoklu rate limit hataları, sayfalama durduruldu");
            }
          } else {
            hasMore = false;
          }
          
          // Eğer hiç ürün alamadıysak hata döndür
          if (allProducts.length === 0) {
            return NextResponse.json({ 
              error: `Etsy API hatası: ${response.status}`,
              products: []
            }, { status: response.status });
          }
          
          // Eğer bazı ürünleri almışsak, onları döndür
          break;
        }

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          console.log(`✅ Sayfa ${page}'den ${data.results.length} ürün alındı`);
          
          // Ürünleri normalize et
          const normalizedProducts = data.results.map((listing: any) => {
            // Resimleri kontrol et ve düzenle
            const processedImages = Array.isArray(listing.images) ? listing.images.map((image: any) => ({
              listing_image_id: image.listing_image_id,
              url_75x75: image.url_75x75,
              url_170x135: image.url_170x135,
              url_570xN: image.url_570xN,
              url_fullxfull: image.url_fullxfull,
              full_height: image.full_height,
              full_width: image.full_width
            })) : [];
            
            return {
              listing_id: listing.listing_id,
              user_id: listing.user_id,
              shop_id: listing.shop_id,
              title: listing.title,
              description: listing.description,
              state: listing.state,
              creation_timestamp: listing.creation_timestamp,
              created_timestamp: listing.created_timestamp,
              ending_timestamp: listing.ending_timestamp,
              original_creation_timestamp: listing.original_creation_timestamp,
              last_modified_timestamp: listing.last_modified_timestamp,
              updated_timestamp: listing.updated_timestamp,
              state_timestamp: listing.state_timestamp,
              quantity: listing.quantity,
              shop_section_id: listing.shop_section_id,
              featured_rank: listing.featured_rank,
              url: listing.url,
              num_favorers: listing.num_favorers,
              tags: listing.tags || [],
              price: listing.price,
              taxonomy_id: listing.taxonomy_id,
              views: listing.views || 0,
              images: processedImages
            };
          });
          
          allProducts.push(...normalizedProducts);
          
          // Eğer alınan ürün sayısı limit'ten az ise, daha fazla ürün yok demektir
          if (data.results.length < limit) {
            hasMore = false;
            console.log("Daha fazla ürün yok");
          } else {
            // Sayfa sayısını arttır, sonraki sayfayı getir
            page++;
            
            // API çağrıları arasında kısa bir bekleme ekleyelim (rate limit'i aşmamak için)
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          hasMore = false;
          console.log("Bu sayfada ürün bulunamadı");
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
        console.error(`Sayfa ${page} alınırken hata:`, error);
        hasMore = false;
        
        // Yerel geliştirme ortamında hata olursa mock API'ye yönlendir
        if (process.env.NODE_ENV === 'development' && allProducts.length === 0) {
          console.log(`Ürünler alınırken hata: ${errorMessage}. Mock API kullanılıyor...`);
          const mockResponse = await fetch(new URL('/api/products/mock', new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')).toString());
          if (mockResponse.ok) {
            return mockResponse;
          }
        }
        
        // Eğer hiç ürün alamadıysak hata döndür
        if (allProducts.length === 0) {
          return NextResponse.json({ 
            error: `Ürünler alınırken hata oluştu: ${errorMessage}`,
            products: []
          }, { status: 500 });
        }
        
        // Eğer bazı ürünleri almışsak, onları döndür
        break;
      }
    }
    
    // Şimdi taslak ürünleri çekelim
    try {
      console.log("Taslak ürünler alınıyor...");
      const draftResponse = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${shopIdInt}/listings/draft?limit=100&includes=Images,Tags`,
        {
          headers: {
            'x-api-key': apiKey,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      if (draftResponse.ok) {
        const draftData = await draftResponse.json();
        if (draftData.results && draftData.results.length > 0) {
          console.log(`✅ ${draftData.results.length} taslak ürün alındı`);
          
          // Ürünleri normalize et
          const draftProducts = draftData.results.map((listing: any) => {
            // Resimleri kontrol et ve düzenle
            const processedImages = Array.isArray(listing.images) ? listing.images.map((image: any) => ({
              listing_image_id: image.listing_image_id,
              url_75x75: image.url_75x75,
              url_170x135: image.url_170x135,
              url_570xN: image.url_570xN,
              url_fullxfull: image.url_fullxfull,
              full_height: image.full_height,
              full_width: image.full_width
            })) : [];
            
            return {
              listing_id: listing.listing_id,
              user_id: listing.user_id,
              shop_id: listing.shop_id,
              title: listing.title,
              description: listing.description,
              state: "draft",
              creation_timestamp: listing.creation_timestamp,
              created_timestamp: listing.created_timestamp,
              ending_timestamp: listing.ending_timestamp,
              original_creation_timestamp: listing.original_creation_timestamp,
              last_modified_timestamp: listing.last_modified_timestamp,
              updated_timestamp: listing.updated_timestamp,
              state_timestamp: listing.state_timestamp,
              quantity: listing.quantity,
              shop_section_id: listing.shop_section_id,
              featured_rank: listing.featured_rank,
              url: listing.url,
              num_favorers: listing.num_favorers,
              tags: listing.tags || [],
              price: listing.price,
              taxonomy_id: listing.taxonomy_id,
              views: 0,
              images: processedImages
            };
          });
          
          allProducts.push(...draftProducts);
        }
      }
    } catch (draftError) {
      console.error("Taslak ürünler alınırken hata:", draftError);
    }
    
    // Şimdi pasif ürünleri çekelim
    try {
      console.log("Pasif ürünler alınıyor...");
      const inactiveResponse = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${shopIdInt}/listings/inactive?limit=100&includes=Images,Tags`,
        {
          headers: {
            'x-api-key': apiKey,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      if (inactiveResponse.ok) {
        const inactiveData = await inactiveResponse.json();
        if (inactiveData.results && inactiveData.results.length > 0) {
          console.log(`✅ ${inactiveData.results.length} pasif ürün alındı`);
          
          // Ürünleri normalize et
          const inactiveProducts = inactiveData.results.map((listing: any) => {
            // Resimleri kontrol et ve düzenle
            const processedImages = Array.isArray(listing.images) ? listing.images.map((image: any) => ({
              listing_image_id: image.listing_image_id,
              url_75x75: image.url_75x75,
              url_170x135: image.url_170x135,
              url_570xN: image.url_570xN,
              url_fullxfull: image.url_fullxfull,
              full_height: image.full_height,
              full_width: image.full_width
            })) : [];
            
            return {
              listing_id: listing.listing_id,
              user_id: listing.user_id,
              shop_id: listing.shop_id,
              title: listing.title,
              description: listing.description,
              state: "inactive",
              creation_timestamp: listing.creation_timestamp,
              created_timestamp: listing.created_timestamp,
              ending_timestamp: listing.ending_timestamp,
              original_creation_timestamp: listing.original_creation_timestamp,
              last_modified_timestamp: listing.last_modified_timestamp,
              updated_timestamp: listing.updated_timestamp,
              state_timestamp: listing.state_timestamp,
              quantity: listing.quantity,
              shop_section_id: listing.shop_section_id,
              featured_rank: listing.featured_rank,
              url: listing.url,
              num_favorers: listing.num_favorers,
              tags: listing.tags || [],
              price: listing.price,
              taxonomy_id: listing.taxonomy_id,
              views: 0,
              images: processedImages
            };
          });
          
          allProducts.push(...inactiveProducts);
        }
      }
    } catch (inactiveError) {
      console.error("Pasif ürünler alınırken hata:", inactiveError);
    }
    
    if (allProducts.length > 0) {
      console.log(`✅ Toplam ${allProducts.length} Etsy ürünü başarıyla alındı`);
      return NextResponse.json({
        success: true,
        total: allProducts.length,
        source: "etsy_api",
        products: allProducts
      });
    }
    
    // Yerel geliştirme ortamında ürün bulunamazsa mock API'ye yönlendir
    if (process.env.NODE_ENV === 'development') {
      console.log("Etsy API'den ürün bulunamadı. Mock API kullanılıyor...");
      const mockResponse = await fetch(new URL('/api/products/mock', new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')).toString());
      if (mockResponse.ok) {
        return mockResponse;
      }
    }
    
    console.error("Etsy API'den ürün bulunamadı");
    return NextResponse.json({ 
      success: false,
      error: "Etsy API'den ürünler alınamadı. Rate limit aşıldı veya ürün bulunamadı.",
      products: []
    }, { status: 404 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('Ürün listesi alınırken hata oluştu:', error);
    
    // Yerel geliştirme ortamında hata olursa mock API'ye yönlendir
    if (process.env.NODE_ENV === 'development') {
      console.log(`Ürün listesi alınamadı: ${errorMessage}. Mock API kullanılıyor...`);
      try {
        const mockResponse = await fetch(new URL('/api/products/mock', new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')).toString());
        if (mockResponse.ok) {
          return mockResponse;
        }
      } catch (mockError) {
        console.error('Mock API çağrısı başarısız:', mockError);
      }
    }
    
    return NextResponse.json({ 
      error: `Ürün listesi alınamadı: ${errorMessage}`,
      products: []
    }, { status: 500 });
  }
} 