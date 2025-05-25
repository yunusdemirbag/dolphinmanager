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

      // Şimdilik boş ürün listesi döndür (gerçek API'den gelecek)
      return NextResponse.json({
        products: [],
        connected: true
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