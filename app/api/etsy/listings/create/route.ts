import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createDraftListing, getEtsyStores, CreateListingData } from "@/lib/etsy-api"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Request body'yi parse et
    const listingData: CreateListingData = await request.json()

    console.log("Creating listing for user:", user.id, "Data:", listingData)

    // Etsy store bilgilerini çek
    const etsyStores = await getEtsyStores(user.id)
    
    if (etsyStores.length === 0) {
      return NextResponse.json({
        error: "No Etsy stores connected",
        message: "Please connect your Etsy store first"
      }, { status: 400 })
    }

    const primaryStore = etsyStores[0] // İlk mağazayı kullan
    console.log("Creating listing for store:", primaryStore.shop_name)

    // Listing oluştur
    const newListing = await createDraftListing(user.id, primaryStore.shop_id, listingData)

    console.log("Listing created successfully:", newListing.listing_id)

    return NextResponse.json({
      success: true,
      listing: newListing,
      message: "Listing created successfully"
    })

  } catch (error: any) {
    console.error("Create listing API error:", error)
    return NextResponse.json(
      { 
        error: "Failed to create listing", 
        details: error.message,
        success: false
      },
      { status: 500 }
    )
  }
} 