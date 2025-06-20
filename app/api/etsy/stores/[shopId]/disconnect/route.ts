import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
// import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: { shopId: string } }
) {
  try {
    console.log("[etsy] /disconnect başlangıç")
    
    // Mevcut client'i kullan
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log("[etsy] /disconnect Auth error:", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const shopId = params.shopId
    console.log("[etsy] /disconnect Disconnecting Etsy store:", shopId, "for user:", user.id)

    try {
      // Etsy token'larını sil
      const { error: tokenError } = await supabase
        .from("etsy_tokens")
        .delete()
        .eq("user_id", user.id)

      if (tokenError) {
        console.error("[etsy] /disconnect Error deleting tokens:", tokenError)
        return NextResponse.json(
          { error: "Failed to disconnect store", details: tokenError.message },
          { status: 500 }
        )
      }

      // Etsy store kayıtlarını sil (eğer varsa)
      const { error: storeError } = await supabase
        .from("etsy_stores")
        .delete()
        .eq("user_id", user.id)
        .eq("shop_id", parseInt(shopId))

      if (storeError) {
        console.warn("[etsy] /disconnect Store deletion warning:", storeError)
        // Bu hata kritik değil, token silme başarılıysa devam et
      }

      // Profile tablosundaki Etsy bağlantı bilgilerini temizle
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          etsy_shop_id: null,
          etsy_shop_name: null,
          etsy_user_id: null
        })
        .eq("id", user.id)

      if (profileError) {
        console.warn("[etsy] /disconnect Profile update warning:", profileError)
        // Bu hata kritik değil, devam et
      }

      console.log("[etsy] /disconnect status=200")
      
      return NextResponse.json({
        success: true,
        message: "Store disconnected successfully"
      })

    } catch (error) {
      console.error("[etsy] /disconnect error:", error)
      return NextResponse.json(
        { error: "Failed to disconnect store", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("[etsy] /disconnect API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 