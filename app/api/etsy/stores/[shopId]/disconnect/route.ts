import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(
  request: NextRequest,
  { params }: { params: { shopId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.log("Auth error:", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const shopId = params.shopId
    console.log("Disconnecting Etsy store:", shopId, "for user:", user.id)

    try {
      // Etsy token'larını sil
      const { error: tokenError } = await supabaseAdmin
        .from("etsy_tokens")
        .delete()
        .eq("user_id", user.id)

      if (tokenError) {
        console.error("Error deleting tokens:", tokenError)
        return NextResponse.json(
          { error: "Failed to disconnect store" },
          { status: 500 }
        )
      }

      // Etsy store kayıtlarını sil (eğer varsa)
      const { error: storeError } = await supabaseAdmin
        .from("etsy_stores")
        .delete()
        .eq("user_id", user.id)
        .eq("shop_id", parseInt(shopId))

      if (storeError) {
        console.warn("Store deletion warning:", storeError)
        // Bu hata kritik değil, token silme başarılıysa devam et
      }

      console.log("Store disconnected successfully")
      
      return NextResponse.json({
        success: true,
        message: "Store disconnected successfully"
      })

    } catch (error) {
      console.error("Disconnect error:", error)
      return NextResponse.json(
        { error: "Failed to disconnect store" },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("Disconnect API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 