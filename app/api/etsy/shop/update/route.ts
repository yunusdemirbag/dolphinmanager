import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { updateShop, getEtsyStores, UpdateShopData } from "@/lib/etsy-api"

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updateData: UpdateShopData = await request.json()

    console.log("Updating shop for user:", user.id, "Data:", updateData)

    // Etsy store bilgilerini çek
    const etsyStores = await getEtsyStores(user.id)
    
    if (etsyStores.length === 0) {
      return NextResponse.json({
        error: "No Etsy stores connected"
      }, { status: 400 })
    }

    const primaryStore = etsyStores[0]

    // Shop güncelle
    const updatedShop = await updateShop(user.id, primaryStore.shop_id, updateData)

    console.log("Shop updated successfully:", primaryStore.shop_id)

    return NextResponse.json({
      success: true,
      shop: updatedShop,
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