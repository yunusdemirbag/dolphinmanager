import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    console.log("Products API called");
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log("Products API auth error:", userError);
      // Geliştirme için test kullanıcı ID'si belirle
      console.log("Setting a test user ID for development");
      // Bu demo kullanıcı ID'si ile işleme devam et
    }

    const userId = user?.id || "71bca451-a580-4bdd-a7eb-91e2d8aa5d12"; // Test için fallback
    console.log("Using user ID:", userId);

    // Etsy shop ID için profilden al
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("etsy_shop_name, etsy_shop_id")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Profile query error:", profileError);
      return NextResponse.json({ error: "Profile not found", products: [] }, { status: 404 });
    }

    if (!profile?.etsy_shop_id) {
      console.error("No Etsy shop ID found for user");
      return NextResponse.json({ error: "No Etsy shop ID found", products: [] }, { status: 404 });
    }

    console.log("📦 Trying direct Etsy API request for shop:", profile.etsy_shop_id);
    
    // Tip tanımı ekleyerek linter hatasını düzelt
    interface EtsyProduct {
      listing_id: number;
      title: string;
      description: string;
      price: {
        amount: number;
        divisor: number;
        currency_code: string;
      };
      quantity: number;
      state: string;
      url: string;
      views: number;
      tags: string[];
      images: Array<{
        url_570xN: string;
        url_fullxfull?: string;
        alt_text?: string;
      }>;
      shop_id: number;
      created_timestamp: number;
      last_modified_timestamp: number;
    }
    
    let allProducts: EtsyProduct[] = [];
    let page = 1;
    let limit = 100; // Etsy API'nin bir seferde izin verdiği maksimum ürün sayısı
    let hasMore = true;
    
    // Sayfalama ile TÜM ürünleri çekelim (sayfa sınırı olmadan)
    while (hasMore) {
      try {
        const offset = (page - 1) * limit;
        
        console.log(`Fetching page ${page} with offset ${offset}...`);
        
        // Etsy API public endpoint kullanarak ürünleri çek (Oauth gerektirmez)
        const listingsResponse = await fetch(
          `https://openapi.etsy.com/v3/application/shops/${profile.etsy_shop_id}/listings/active?limit=${limit}&offset=${offset}&includes=Images,Tags`, 
          {
            headers: {
              "x-api-key": process.env.ETSY_CLIENT_ID as string,
            }
          }
        );
        
        if (listingsResponse.ok) {
          const listingsData = await listingsResponse.json();
          
          if (listingsData.results && listingsData.results.length > 0) {
            console.log(`✅ Fetched ${listingsData.results.length} products on page ${page}`);
            
            // Ürünleri normalize et
            const normalizedProducts = await Promise.all(listingsData.results.map(async (listing: any) => {
              let images = listing.images || [];
              // Eğer images boşsa, Etsy API'den çek
              if (!images || images.length === 0) {
                try {
                  const imagesRes = await fetch(
                    `https://openapi.etsy.com/v3/application/listings/${listing.listing_id}/images`,
                    {
                      headers: {
                        "x-api-key": process.env.ETSY_CLIENT_ID as string,
                      },
                    }
                  );
                  if (imagesRes.ok) {
                    const imagesData = await imagesRes.json();
                    if (imagesData.results && imagesData.results.length > 0) {
                      images = imagesData.results.map((img: any) => ({
                        url_570xN: img.url_570xN,
                        url_fullxfull: img.url_fullxfull,
                        alt_text: img.alt_text || listing.title
                      }));
                    }
                  }
                } catch (err) {
                  console.error("Image fetch error for listing", listing.listing_id, err);
                }
              }
              
              // Etsy'den ürün detaylarını çek (views, favorites, sold)
              let productMetrics = {
                views: 0,
                favorites: 0,
                sold: 0
              };
              
              try {
                const productDetailRes = await fetch(
                  `https://openapi.etsy.com/v3/application/listings/${listing.listing_id}`,
                  {
                    headers: {
                      "x-api-key": process.env.ETSY_CLIENT_ID as string,
                    },
                  }
                );
                
                if (productDetailRes.ok) {
                  const productDetail = await productDetailRes.json();
                  productMetrics = {
                    views: productDetail.views || 0,
                    favorites: productDetail.num_favorers || 0,
                    sold: productDetail.quantity_sold || 0
                  };
                }
              } catch (error) {
                console.error(`Error fetching metrics for listing ${listing.listing_id}:`, error);
              }

              return {
                listing_id: listing.listing_id,
                title: listing.title,
                description: listing.description,
                price: {
                  amount: listing.price.amount,
                  divisor: listing.price.divisor,
                  currency_code: listing.price.currency_code
                },
                quantity: listing.quantity,
                state: listing.state,
                url: listing.url,
                views: productMetrics.views,
                tags: listing.tags || [],
                images: images,
                shop_id: listing.shop_id,
                created_timestamp: listing.creation_tsz || Date.now() / 1000,
                last_modified_timestamp: listing.last_modified_timestamp || Date.now() / 1000,
                metrics: productMetrics
              };
            }));
            
            allProducts = [...allProducts, ...normalizedProducts];
            
            // Eğer alınan ürün sayısı limit'ten az ise, daha fazla ürün yok demektir
            if (listingsData.results.length < limit) {
              hasMore = false;
              console.log("No more products to fetch");
            } else {
              // Sayfa sayısını arttır, sonraki sayfayı getir
              page++;
              
              // API çağrıları arasında kısa bir bekleme ekleyelim (rate limit'i aşmamak için)
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } else {
            hasMore = false;
            console.log("No products found on this page");
          }
        } else {
          console.error(`Direct Etsy API error on page ${page}:`, listingsResponse.status, listingsResponse.statusText);
          
          // Rate limit aşıldıysa bekleyelim
          if (listingsResponse.status === 429) {
            console.log("Rate limit exceeded, pausing for 2 seconds before next attempt");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Eğer birkaç denemeden sonra hala başarısız olursa, devam etmeyi bırak
            if (page > 3) {
              hasMore = false;
              console.log("Multiple rate limit errors, stopping pagination");
            }
          } else {
            hasMore = false;
          }
        }
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        hasMore = false;
      }
    }
    
    // Şimdi taslak ürünleri çekelim
    try {
      console.log("Attempting to fetch draft products...");
      const draftResponse = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${profile.etsy_shop_id}/listings/draft?limit=100&includes=Images,Tags`, 
        {
          headers: {
            "x-api-key": process.env.ETSY_CLIENT_ID as string,
          }
        }
      );
      
      if (draftResponse.ok) {
        const draftData = await draftResponse.json();
        if (draftData.results && draftData.results.length > 0) {
          console.log(`✅ Fetched ${draftData.results.length} draft products`);
          
          // Ürünleri normalize et
          const draftProducts = draftData.results.map((listing: any) => ({
            listing_id: listing.listing_id,
            title: listing.title,
            description: listing.description,
            price: {
              amount: listing.price.amount,
              divisor: listing.price.divisor,
              currency_code: listing.price.currency_code
            },
            quantity: listing.quantity,
            state: "draft",
            url: listing.url,
            views: 0,
            tags: listing.tags || [],
            images: listing.images || [],
            shop_id: listing.shop_id,
            created_timestamp: listing.creation_tsz || Date.now() / 1000,
            last_modified_timestamp: listing.last_modified_timestamp || Date.now() / 1000,
            metrics: {
              views: 0,
              favorites: 0,
              sold: 0
            }
          }));
          
          allProducts = [...allProducts, ...draftProducts];
        }
      }
    } catch (draftError) {
      console.error("Error fetching draft products:", draftError);
    }
    
    // Şimdi pasif ürünleri çekelim
    try {
      console.log("Attempting to fetch inactive products...");
      const inactiveResponse = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${profile.etsy_shop_id}/listings/inactive?limit=100&includes=Images,Tags`, 
        {
          headers: {
            "x-api-key": process.env.ETSY_CLIENT_ID as string,
          }
        }
      );
      
      if (inactiveResponse.ok) {
        const inactiveData = await inactiveResponse.json();
        if (inactiveData.results && inactiveData.results.length > 0) {
          console.log(`✅ Fetched ${inactiveData.results.length} inactive products`);
          
          // Ürünleri normalize et
          const inactiveProducts = inactiveData.results.map((listing: any) => ({
            listing_id: listing.listing_id,
            title: listing.title,
            description: listing.description,
            price: {
              amount: listing.price.amount,
              divisor: listing.price.divisor,
              currency_code: listing.price.currency_code
            },
            quantity: listing.quantity,
            state: "inactive",
            url: listing.url,
            views: 0,
            tags: listing.tags || [],
            images: listing.images || [],
            shop_id: listing.shop_id,
            created_timestamp: listing.creation_tsz || Date.now() / 1000,
            last_modified_timestamp: listing.last_modified_timestamp || Date.now() / 1000,
            metrics: {
              views: 0,
              favorites: 0,
              sold: 0
            }
          }));
          
          allProducts = [...allProducts, ...inactiveProducts];
        }
      }
    } catch (inactiveError) {
      console.error("Error fetching inactive products:", inactiveError);
    }
    
    if (allProducts.length > 0) {
      console.log(`✅ Successfully fetched ${allProducts.length} total Etsy products`);

      return NextResponse.json({
        success: true,
        total: allProducts.length,
        source: "etsy_api",
        products: allProducts
      });
    }
    
    console.error("No products found from Etsy API");
    
    // Demo ürünleri kaldırıyorum
    return NextResponse.json({ 
      success: false,
      error: "Etsy API'den ürünler alınamadı. Rate limit aşıldı veya ürün bulunamadı.",
      products: [],
      source: "etsy_api_direct"
    }, { status: 200 });

  } catch (error: any) {
    console.error("Products API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch products", 
        details: error.message,
        products: []
      },
      { status: 500 }
    );
  }
} 