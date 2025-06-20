import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
// import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[etsy] /reset başlangıç")
    
    // Mevcut client'i kullan
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log("[etsy] /reset Auth error:", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[etsy] /reset Resetting Etsy connection for user:", user.id)

    try {
      // 1. Tüm Etsy token'larını sil
      const { error: tokenError } = await supabase
        .from("etsy_tokens")
        .delete()
        .eq("user_id", user.id)

      if (tokenError) {
        console.error("[etsy] /reset Error deleting tokens:", tokenError)
        return NextResponse.json(
          { error: "Failed to reset Etsy connection", details: tokenError.message },
          { status: 500 }
        )
      }

      // 2. Tüm Etsy mağaza kayıtlarını sil
      const { error: storeError } = await supabase
        .from("etsy_stores")
        .delete()
        .eq("user_id", user.id)

      if (storeError) {
        console.warn("[etsy] /reset Store deletion warning:", storeError)
        // Bu hata kritik değil, token silme başarılıysa devam et
      }

      // 3. Tüm Etsy ürünlerini sil
      const { error: listingsError } = await supabase
        .from("etsy_listings")
        .delete()
        .eq("user_id", user.id)

      if (listingsError) {
        console.warn("[etsy] /reset Listings deletion warning:", listingsError)
        // Bu hata kritik değil, devam et
      }

      // 4. Profile tablosundaki Etsy bağlantı bilgilerini temizle
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          etsy_shop_id: null,
          etsy_shop_name: null,
          etsy_user_id: null
        })
        .eq("id", user.id)

      if (profileError) {
        console.warn("[etsy] /reset Profile update warning:", profileError)
        // Bu hata kritik değil, devam et
      }

      console.log("[etsy] /reset status=200")
      
      return NextResponse.json({
        success: true,
        message: "Etsy connection reset successfully"
      })

    } catch (error) {
      console.error("[etsy] /reset error:", error)
      return NextResponse.json(
        { error: "Failed to reset Etsy connection", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("[etsy] /reset API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 