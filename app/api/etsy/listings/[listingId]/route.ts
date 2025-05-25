import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { updateListing, deleteListing, getEtsyStores, UpdateListingData } from "@/lib/etsy-api"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const listingId = parseInt(params.listingId)
    const updateData: UpdateListingData = await request.json()

    console.log("Updating listing:", listingId, "Data:", updateData)

    // Etsy store bilgilerini çek
    const etsyStores = await getEtsyStores(user.id)
    
    if (etsyStores.length === 0) {
      return NextResponse.json({
        error: "No Etsy stores connected"
      }, { status: 400 })
    }

    const primaryStore = etsyStores[0]

    // Listing güncelle
    const updatedListing = await updateListing(user.id, primaryStore.shop_id, listingId, updateData)

    console.log("Listing updated successfully:", listingId)

    return NextResponse.json({
      success: true,
      listing: updatedListing,
      message: "Listing updated successfully"
    })

  } catch (error: any) {
    console.error("Update listing API error:", error)
    return NextResponse.json(
      { 
        error: "Failed to update listing", 
        details: error.message,
        success: false
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const listingId = parseInt(params.listingId)

    console.log("Deleting listing:", listingId)

    // Listing sil
    await deleteListing(user.id, listingId)

    console.log("Listing deleted successfully:", listingId)

    return NextResponse.json({
      success: true,
      message: "Listing deleted successfully"
    })

  } catch (error: any) {
    console.error("Delete listing API error:", error)
    return NextResponse.json(
      { 
        error: "Failed to delete listing", 
        details: error.message,
        success: false
      },
      { status: 500 }
    )
  }
} 