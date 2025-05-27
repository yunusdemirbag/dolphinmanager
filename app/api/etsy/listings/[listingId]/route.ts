import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { updateListing, deleteListing, getEtsyStores, UpdateListingData } from "@/lib/etsy-api"
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    console.log("--- PATCH /api/etsy/listings/[listingId] ---");
    // Hard-code the userId - routes/api klasöründeki aynı userId'yi kullan
    const userId = "71bca451-a580-4bdd-a7eb-91e2d8aa5d12";
    console.log("Using user ID:", userId);
    
    // listingId'yi params'dan alırken güvenli bir şekilde al
    if (!params || !params.listingId) {
      return NextResponse.json({
        error: "Missing listing ID",
        success: false
      }, { status: 400 });
    }
    
    const listingId = parseInt(params.listingId);
    if (isNaN(listingId)) {
      return NextResponse.json({
        error: "Invalid listing ID",
        success: false
      }, { status: 400 });
    }
    
    const updateData: UpdateListingData = await request.json();

    console.log("Updating listing:", listingId, "Data:", updateData);

    // Etsy store bilgilerini çek - userId ile doğrudan çağır
    const etsyStores = await getEtsyStores(userId);
    
    if (!etsyStores || etsyStores.length === 0) {
      return NextResponse.json({
        error: "No Etsy stores connected",
        success: false
      }, { status: 400 });
    }

    const primaryStore = etsyStores[0];

    // Listing güncelle
    const updatedListing = await updateListing(userId, primaryStore.shop_id, listingId, updateData);

    console.log("Listing updated successfully:", listingId);

    return NextResponse.json({
      success: true,
      listing: updatedListing,
      message: "Listing updated successfully"
    });

  } catch (error: any) {
    console.error("Update listing API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to update listing", 
        details: error.message,
        success: false
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    console.log("--- DELETE /api/etsy/listings/[listingId] ---");
    // Hard-code the userId - routes/api klasöründeki aynı userId'yi kullan
    const userId = "71bca451-a580-4bdd-a7eb-91e2d8aa5d12";
    console.log("Using user ID:", userId);
    
    // listingId'yi params'dan alırken güvenli bir şekilde al
    if (!params || !params.listingId) {
      return NextResponse.json({
        error: "Missing listing ID",
        success: false
      }, { status: 400 });
    }
    
    const listingId = parseInt(params.listingId);
    if (isNaN(listingId)) {
      return NextResponse.json({
        error: "Invalid listing ID",
        success: false
      }, { status: 400 });
    }
    
    console.log("Deleting listing:", listingId);

    // Listing sil - userId ile doğrudan çağır
    await deleteListing(userId, listingId);

    console.log("Listing deleted successfully:", listingId);

    return NextResponse.json({
      success: true,
      message: "Listing deleted successfully"
    });

  } catch (error: any) {
    console.error("Delete listing API error:", error);
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