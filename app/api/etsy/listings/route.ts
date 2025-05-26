import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEtsyListings } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log("Listings API auth error:", userError, "No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parametreleri al
    const searchParams = request.nextUrl.searchParams
    const shopId = searchParams.get("shopId") || "1" // Varsayılan mağaza ID'si
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit
    const state = searchParams.get("state") || "active"

    console.log(`Fetching Etsy listings for user: ${user.id}, shop: ${shopId}, state: ${state}, page: ${page}, limit: ${limit}`)

    try {
      // Önce gerçek Etsy API'sini dene
      const { listings, count } = await getEtsyListings(
        user.id, 
        parseInt(shopId), 
        limit, 
        offset, 
        state as any
      )
      
      if (listings && listings.length > 0) {
        console.log("✅ Real Etsy listings found:", listings.length)
        
        return NextResponse.json({
          listings,
          pagination: {
            total: count,
            limit,
            offset,
            page,
            pages: Math.ceil(count / limit)
          },
          source: "etsy_api"
        })
      }
    } catch (etsyError) {
      console.error("Etsy Listings API error:", etsyError)
    }

    // API hatası durumunda veritabanından verileri çekmeye çalış
    try {
      const { data: products, error: productsError, count } = await supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)

      if (productsError) {
        console.error("Database products error:", productsError)
      }

      if (products && products.length > 0) {
        console.log("📦 Using database products:", products.length)
        
        // Ürünleri Etsy listing formatına çevir
        const listings = products.map(product => ({
          listing_id: product.id,
          user_id: parseInt(user.id),
          shop_id: parseInt(shopId),
          title: product.name || product.title || "Ürün",
          description: product.description || "",
          state: product.status || "active",
          quantity: product.stock || 1,
          url: product.url || `https://www.etsy.com/listing/${product.id}`,
          views: product.views || 0,
          price: {
            amount: product.price * 100, // Cent olarak
            divisor: 100,
            currency_code: product.currency || "USD"
          },
          tags: product.tags ? product.tags.split(",") : [],
          images: product.images ? product.images.map((url: string, i: number) => ({
            listing_id: product.id,
            listing_image_id: i + 1,
            url_75x75: url,
            url_170x135: url,
            url_570xN: url,
            url_fullxfull: url,
            alt_text: product.name || "Ürün görseli"
          })) : []
        }))
        
        return NextResponse.json({
          listings,
          pagination: {
            total: count || products.length,
            limit,
            offset,
            page,
            pages: Math.ceil((count || products.length) / limit)
          },
          source: "database"
        })
      }
    } catch (dbError) {
      console.error("Database products fetch error:", dbError)
    }

    // Demo/mock ürün oluşturma ve döndürme kodları kaldırıldı
    // Eğer veri yoksa boş dizi dön
    return NextResponse.json({
      listings: [],
      pagination: {
        total: 0,
        limit,
        offset,
        page,
        pages: 0
      },
      source: "none",
      message: "Hiçbir ürün bulunamadı."
    })
    
  } catch (error: any) {
    console.error("Listings API error:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch listings", 
        details: error.message,
        listings: []
      },
      { status: 500 }
    )
  }
} 