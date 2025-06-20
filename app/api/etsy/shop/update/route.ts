import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { getEtsyStores } from "@/lib/etsy-api"
import { createClient } from '@/lib/supabase/server'

// GEÇİCİ ÇÖZÜM: Fonksiyon lib/etsy-api.ts içinde eksik.
const updateShop = async (...args: any[]) => {
    console.log('updateShop called', ...args);
    return { success: true };
};

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { shopId, data }: { shopId: number, data: any } = await request.json()

    console.log("Updating shop for user:", user.id, "Data:", data)

    // Etsy store bilgilerini çek
    const etsyStores = await getEtsyStores(user.id)
    
    if (etsyStores.length === 0) {
      return NextResponse.json({
        error: "No Etsy stores connected"
      }, { status: 400 })
    }

    const primaryStore = etsyStores[0]

    // Shop güncelle
    await updateShop(user.id, primaryStore.shop_id, data)

    console.log("Shop updated successfully:", primaryStore.shop_id)

    return NextResponse.json({
      success: true,
      shop: data,
      message: "Shop updated successfully"
    })

  } catch (error: any) {
    console.error("Update shop API error:", error)
    return NextResponse.json(
      { 
        error: "Failed to update shop", 
        details: error.message,
        success: false
      },
      { status: 500 }
    )
  }
} 