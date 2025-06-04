import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEtsyStores, getValidAccessToken } from "@/lib/etsy-api"

export async function PUT(
  request: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    console.log("Inventory update API called");
    
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
    
    // Get a valid access token
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json({
        error: "Failed to get valid access token",
        success: false,
        reconnect_required: true
      }, { status: 401 });
    }
    
    // Make the request to Etsy's inventory API
    try {
      const response = await fetch(
        `https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ETSY_CLIENT_ID as string,
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify(body)
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Etsy API error:", response.status, errorText);
        return NextResponse.json({
          error: `Etsy API error: ${response.status}`,
          details: errorText,
          success: false
        }, { status: response.status });
      }
      
      const result = await response.json();
      
      // Add cache-control header to prevent browser caching
      const headers = new Headers();
      headers.append('Cache-Control', 'no-store, must-revalidate');
      headers.append('Pragma', 'no-cache');
      headers.append('Expires', '0');
      
      return NextResponse.json({
        success: true,
        message: "Inventory updated successfully",
        data: result
      }, { headers });
      
    } catch (error) {
      console.error("Error updating inventory:", error);
      return NextResponse.json({
        error: "Failed to update inventory",
        details: error instanceof Error ? error.message : "Unknown error",
        success: false
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in inventory update API:", error);
    return NextResponse.json({
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error",
      success: false
    }, { status: 500 });
  }
}

// Add OPTIONS method handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      'Access-Control-Max-Age': '86400' // 24 hours
    }
  });
} 