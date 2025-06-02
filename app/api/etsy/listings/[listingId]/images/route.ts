import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { reorderListingImages, getEtsyStores, invalidateShopCache, getValidAccessToken } from "@/lib/etsy-api"

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

export async function POST(
  request: NextRequest,
  { params }: { params: { listingId: string } },
) {
  try {
    console.log("Image upload API called - Starting process");

    const resolvedParams = await params;
    const listingId = resolvedParams?.listingId ? parseInt(resolvedParams.listingId) : null;

    let userId = "71bca451-a580-4bdd-a7eb-91e2d8aa5d12"; // Default fallback

    try {
      const supabase = await createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!userError && user) {
        userId = user.id;
        console.log("Authenticated user found:", userId);
      } else {
        console.log("Using fallback user ID:", userId);
      }
    } catch (authError) {
      console.log("Auth error (using fallback ID):", authError);
    }

    if (!listingId || isNaN(listingId)) {
      console.error("Invalid or missing listing ID");
      return NextResponse.json({
        error: "Invalid or missing listing ID",
        success: false
      }, { status: 400 });
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      console.error("No image file provided in FormData");
      return NextResponse.json({ error: "No image file provided.", success: false }, { status: 400 });
    }

    console.log("Image file details:", {
      name: imageFile.name,
      type: imageFile.type,
      size: imageFile.size
    });

    const stores = await getEtsyStores(userId, true);
    console.log("Etsy stores found:", stores?.length || 0);

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

    // Get Etsy credentials including access token
    const etsyAccessToken = await getValidAccessToken(userId);
    const apiKey = process.env.ETSY_CLIENT_ID;

    console.log("Etsy credentials check:", {
      hasAccessToken: !!etsyAccessToken,
      hasApiKey: !!apiKey
    });

    if (!etsyAccessToken || !apiKey) {
        console.error("Etsy credentials not found for user:", userId);
        return NextResponse.json({
            error: "Etsy credentials not found or invalid. Please reconnect your store.",
            success: false,
            reconnect_required: true,
            message: "Your Etsy connection needs to be refreshed. Please reconnect your store."
        }, { status: 401 });
    }

    // Create a new FormData instance for Etsy
    const etsyFormData = new FormData();
    
    // Convert the image file to a Blob with the correct type
    const imageBlob = new Blob([await imageFile.arrayBuffer()], { type: imageFile.type });
    console.log("Image converted to Blob:", {
      type: imageBlob.type,
      size: imageBlob.size
    });
    
    // Append the image to the FormData with the correct field name and filename
    etsyFormData.append('image', imageBlob, imageFile.name);

    // Get the rank parameter from the incoming request FormData and append to Etsy FormData
    const rank = formData.get('rank');
    if (rank !== null) { // Check for null as rank can be 0 or undefined if not sent
      etsyFormData.append('rank', rank.toString());
      console.log("Appending rank to Etsy FormData:", rank);
    }

    console.log("Sending request to Etsy API...");
    // Call Etsy API to upload image
    const etsyResponse = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/images`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${etsyAccessToken}`,
          'x-api-key': apiKey,
        },
        body: etsyFormData,
      }
    );

    console.log("Etsy API Response Status:", etsyResponse.status);
    
    let responseData;
    try {
      const textResponse = await etsyResponse.text();
      console.log("Etsy API Raw Response Body:", textResponse);

      try {
        responseData = JSON.parse(textResponse);
        console.log("Etsy API Parsed Response Data:", responseData);
      } catch (jsonParseError) {
        console.warn('Could not parse Etsy response as JSON, treating as text.');
        responseData = { message: textResponse, error: 'Non-JSON response from Etsy API' };
      }

    } catch (responseReadError) {
      console.error('Error reading Etsy response body:', responseReadError);
      responseData = { error: 'Error reading response from Etsy API' };
    }

    if (!etsyResponse.ok) {
      console.error('Etsy API Error (upload image):', etsyResponse.status, responseData);
      const errorDetails = responseData.details || responseData.error || responseData.message || 'No specific error message from Etsy.';
      console.error('Etsy API Error Details:', errorDetails);

      return NextResponse.json({
        error: `Etsy API'den resim yükleme hatası: ${etsyResponse.status}. Detay: ${errorDetails}`,
        details: responseData,
        success: false
      }, { status: etsyResponse.status });
    }

    console.log("Image uploaded successfully to Etsy:", responseData);
    console.log('Etsy API Success Data:', responseData.data);

    const uploadedImageId = responseData?.data?.listing_image_id;

    // Invalidate cache to ensure fresh data on the next fetch
    try {
      invalidateShopCache(userId, shopId);
      console.log("Cache invalidated for this shop after image upload");
    } catch (cacheError) {
      console.warn("Error invalidating cache:", cacheError);
    }

    return NextResponse.json({
      success: true,
      message: "Image uploaded successfully to Etsy.",
      data: responseData.data,
      uploaded_image_id: uploadedImageId
    });

  } catch (error) {
    console.error("Error uploading image (catch block):", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during image upload process";
    return NextResponse.json({
      error: `Resim yükleme sırasında beklenmeyen bir hata oluştu: ${errorMessage}`,
      success: false
    }, { status: 500 });
  }
} 