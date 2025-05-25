import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { getEtsyStores, getEtsyListings } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log("Auth error:", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Fetching Etsy products for user:", user.id)

    try {
      // Etsy store bilgilerini çek
      const etsyStores = await getEtsyStores(user.id)
      
      if (etsyStores.length === 0) {
        return NextResponse.json({
          products: [],
          connected: false,
          message: "No Etsy stores connected"
        })
      }

      console.log("Found Etsy stores:", etsyStores.length)
      const primaryStore = etsyStores[0] // İlk mağazayı kullan
      console.log("Fetching products for store:", primaryStore.shop_name, "ID:", primaryStore.shop_id)

      // Gerçek ürünleri çek
      const { listings, count } = await getEtsyListings(user.id, primaryStore.shop_id, 25, 0)
      console.log("Fetched products:", listings.length, "of", count)

      // Ürünleri uygun formata çevir
      const products = listings.map(listing => ({
        id: listing.listing_id,
        title: listing.title,
        description: listing.description,
        price: listing.price.amount / listing.price.divisor,
        currency: listing.price.currency_code,
        quantity: listing.quantity,
        state: listing.state,
        url: listing.url,
        views: listing.views || 0,
        tags: listing.tags,
        images: listing.images.map(img => ({
          id: img.listing_image_id,
          url_75x75: img.url_75x75,
          url_170x135: img.url_170x135,
          url_570xN: img.url_570xN,
          url_fullxfull: img.url_fullxfull,
          alt_text: img.alt_text
        })),
        shop_id: listing.shop_id,
        user_id: listing.user_id
      }))

      return NextResponse.json({
        products,
        connected: true,
        total: count,
        store: {
          shop_id: primaryStore.shop_id,
          shop_name: primaryStore.shop_name,
          url: primaryStore.url
        }
      })

    } catch (etsyError: any) {
      console.error("Etsy API error:", etsyError)
      
      // Etsy bağlantı sorunu varsa boş veri döndür
      return NextResponse.json({
        products: [],
        connected: false,
        error: etsyError.message
      })
    }

  } catch (error: any) {
    console.error("Products API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch products", details: error.message },
      { status: 500 }
    )
  }
} 