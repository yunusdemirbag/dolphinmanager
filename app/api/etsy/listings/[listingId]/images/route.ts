import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { reorderListingImages, getEtsyStores, invalidateShopCache } from "@/lib/etsy-api"

export async function PUT(
  request: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    console.log("Image reordering API called");
    
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
    const listingId = params?.listingId ? parseInt(params.listingId) : null;
    if (!listingId || isNaN(listingId)) {
      console.error("Invalid or missing listing ID");
      return NextResponse.json({
        error: "Invalid or missing listing ID",
        success: false
      }, { status: 400 });
    }
    
    // Parse the request body
    let body;
    try {
      body = await request.json();
      console.log("Request body received:", JSON.stringify(body));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json({
        error: "Invalid request body - could not parse JSON",
        success: false
      }, { status: 400 });
    }
    
    // Check if the request contains image IDs
    if (!body.image_ids || !Array.isArray(body.image_ids) || body.image_ids.length === 0) {
      console.error("Missing or invalid image_ids field:", body);
      return NextResponse.json({
        error: "Missing or invalid image_ids field",
        success: false
      }, { status: 400 });
    }
    
    // Make sure all IDs are integers
    const imageIds = body.image_ids.map((id: any) => parseInt(String(id)));
    
    // Validate that we have at least one valid image ID
    const validImageIds = imageIds.filter((id: number) => !isNaN(id) && id > 0);
    if (validImageIds.length === 0) {
      console.error("No valid image IDs provided:", imageIds);
      return NextResponse.json({
        error: "No valid image IDs provided",
        success: false
      }, { status: 400 });
    }
    
    // Get Etsy stores directly from the API to avoid database lookup issues
    const stores = await getEtsyStores(userId, true);
    
    if (!stores || stores.length === 0) {
      console.error("No Etsy stores found for user:", userId);
      return NextResponse.json({
        error: "No Etsy stores found",
        success: false,
        reconnect_required: true,
        message: "Your Etsy connection needs to be refreshed. Please reconnect your store."
      }, { status: 401 });
    }
    
    const shopId = stores[0].shop_id;
    console.log("Using shop ID:", shopId);
    
    // Log the reordering data for debugging
    console.log(`Reordering images for listing: ${listingId}, Shop: ${shopId}, Order:`, validImageIds);
    
    // Reorder the listing images
    const success = await reorderListingImages(userId, shopId, listingId, validImageIds);
    
    if (success) {
      // Invalidate cache to ensure fresh data on the next fetch
      try {
        invalidateShopCache(userId, shopId);
        console.log("Cache invalidated for this shop after image reordering");
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
        message: "Images reordered successfully for listing: " + listingId,
        listing_id: listingId,
        shop_id: shopId,
        image_ids: validImageIds
      }, { headers });
    } else {
      console.error("Failed to reorder images via Etsy API");
      return NextResponse.json({
        error: "Failed to reorder images - Etsy API returned an error",
        success: false,
        listing_id: listingId,
        image_ids: validImageIds
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error reordering listing images:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      error: errorMessage,
      success: false
    }, { status: 500 });
  }
} 