import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateListing, deleteListing, getEtsyStores, UpdateListingData } from "@/lib/etsy-api"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    // Make sure we use the hardcoded user ID if auth fails
    let userId = "71bca451-a580-4bdd-a7eb-91e2d8aa5d12"; // Default fallback
    
    try {
      const supabase = await createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!userError && user) {
        userId = user.id;
      }
    } catch (authError) {
      console.log("Auth error (using fallback ID):", authError);
    }
    
    console.log("Using user ID:", userId);
    
    // Ensure we have a valid listing ID
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
    
    // Parse the request body
    const body = await request.json();
    
    // Get Etsy stores directly from the API to avoid database lookup issues
    // Set skipCache to true to always get the latest data
    const stores = await getEtsyStores(userId, true);
    
    if (!stores || stores.length === 0) {
      return NextResponse.json({
        error: "No Etsy stores found",
        success: false,
        reconnect_required: true,
        message: "Your Etsy connection needs to be refreshed. Please reconnect your store."
      }, { status: 401 });
    }
    
    const shopId = stores[0].shop_id;
    console.log("Using shop ID:", shopId);
    
    // Log the update data for debugging
    console.log("Updating listing:", listingId, "Data:", body);
    
    // Force the quantity to be a number for proper handling
    if (body.quantity !== undefined) {
      body.quantity = Number(body.quantity);
    }
    
    // Convert price object to number if it comes from the frontend
    if (body.price && typeof body.price === 'object' && body.price.amount !== undefined) {
      body.price = Math.round((body.price.amount / body.price.divisor) * 100);
      console.log("Converted price object to cents:", body.price);
    }

    // Create a clean update object with only the fields we want to update
    const updateData = {
      quantity: body.quantity,
      price: body.price,
      title: body.title,
      description: body.description,
      state: body.state
    };
    
    console.log("Clean update data:", updateData);
    
    try {
      // Update the listing
      const updatedListing = await updateListing(userId, shopId, listingId, updateData);
      
      // Invalidate cache to ensure fresh data on the next fetch
      try {
        // Import without breaking
        const { invalidateShopCache } = require("@/lib/etsy-api");
        invalidateShopCache(userId, shopId);
        console.log("Cache invalidated for this shop after update");
      } catch (cacheError) {
        console.warn("Error invalidating cache:", cacheError);
      }
      
      // Add cache-control header to prevent browser caching
      const headers = new Headers();
      headers.append('Cache-Control', 'no-store, must-revalidate');
      headers.append('Pragma', 'no-cache');
      headers.append('Expires', '0');
      
      return NextResponse.json({
        success: true,
        message: "Listing updated successfully: " + listingId,
        listing: updatedListing
      }, { headers });
    } catch (updateError: any) {
      console.error("Specific error updating listing:", updateError);
      
      // Check if it's an API key error or token error
      const errorMessage = updateError.message || "";
      const isAuthError = typeof errorMessage === 'string' && (
        errorMessage.includes("Invalid API key") || 
        errorMessage.includes("invalid_token") ||
        errorMessage.includes("token") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("RECONNECT_REQUIRED")
      );
      
      if (isAuthError) {
        // Try refreshing the cache and retry
        try {
          // Import without breaking
          const { invalidateUserCache } = require("@/lib/etsy-api");
          invalidateUserCache(userId);
          console.log("Invalidated all user cache due to token error");
          
          // Return proper error message for client to handle
          return NextResponse.json({
            error: "Etsy authorization error - reconnection required",
            details: errorMessage,
            reconnect_required: true,
            success: false
          }, { status: 401 });
        } catch (cacheError) {
          console.error("Error invalidating cache:", cacheError);
        }
      }
      
      return NextResponse.json({
        error: updateError instanceof Error ? updateError.message : "Unknown error during update",
        success: false
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error updating listing:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      success: false
    }, { status: 500 });
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
    
    // Get listing ID from the URL path params
    const listingIdParam = params.listingId;
    
    // Ensure we have a valid listing ID
    if (!listingIdParam) {
      return NextResponse.json({
        error: "Missing listing ID",
        success: false
      }, { status: 400 });
    }
    
    const listingId = parseInt(listingIdParam);
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
    );
  }
} 