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
    console.log("[IMAGE_UPLOAD_API] Image upload API called");
    
    // Set CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    
    // Handle CORS preflight request
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { 
        status: 204,
        headers
      });
    }

    // Önce params'ı await et
    const resolvedParams = await params;
    const listingId = resolvedParams?.listingId ? parseInt(resolvedParams.listingId) : null;

    if (!listingId || isNaN(listingId)) {
      console.error("[IMAGE_UPLOAD_API] Invalid listing ID:", resolvedParams?.listingId);
      return NextResponse.json({
        error: "Geçersiz ürün ID'si",
        success: false
      }, { status: 400, headers });
    }

    let userId = "71bca451-a580-4bdd-a7eb-91e2d8aa5d12"; // Default fallback

    try {
      const supabase = await createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!userError && user) {
        userId = user.id;
      }
    } catch (authError) {
      console.log("[IMAGE_UPLOAD_API] Auth error (using fallback ID):", authError);
    }

    // Get form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const rank = formData.get('rank');

    if (!imageFile) {
      console.error("[IMAGE_UPLOAD_API] No image file provided");
      return NextResponse.json({ 
        error: "Resim dosyası bulunamadı", 
        success: false 
      }, { status: 400 });
    }

    // Validate image format
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(imageFile.type)) {
      console.error("[IMAGE_UPLOAD_API] Invalid file type:", imageFile.type);
      return NextResponse.json({ 
        error: "Geçersiz dosya formatı. Sadece JPG, JPEG, PNG veya GIF formatları kabul edilir.", 
        success: false 
      }, { status: 400 });
    }

    // Validate image size (25MB limit)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (imageFile.size > MAX_FILE_SIZE) {
      console.error("[IMAGE_UPLOAD_API] File too large:", imageFile.size);
      return NextResponse.json({ 
        error: `Dosya boyutu çok büyük: ${(imageFile.size / 1024 / 1024).toFixed(2)}MB. Maximum 25MB kabul edilir.`,
        success: false 
      }, { status: 400 });
    }

    // Get store info
    const stores = await getEtsyStores(userId, true);
    if (!stores || stores.length === 0) {
      console.error("[IMAGE_UPLOAD_API] No stores found for user:", userId);
      return NextResponse.json({
        error: "Etsy mağazası bulunamadı",
        success: false,
        reconnect_required: true
      }, { status: 401 });
    }

    const shopId = stores[0].shop_id;
    console.log("[IMAGE_UPLOAD_API] Using shop ID:", shopId);

    // Get access token
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      console.error("[IMAGE_UPLOAD_API] No valid access token found");
      return NextResponse.json({
        error: "Etsy bağlantısı geçersiz. Lütfen yeniden bağlanın.",
        success: false,
        reconnect_required: true
      }, { status: 401 });
    }

    // Prepare form data for Etsy
    const etsyFormData = new FormData();
    etsyFormData.append('image', new Blob([await imageFile.arrayBuffer()], { type: imageFile.type }), imageFile.name);
    if (rank !== null) {
      etsyFormData.append('rank', rank.toString());
    }

    // Log headers for debugging CORS issues
    console.log("[IMAGE_UPLOAD_API] Request headers to Etsy:", {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': process.env.ETSY_CLIENT_ID as string,
    });

    // Upload image to Etsy
    console.log("[IMAGE_UPLOAD_API] Uploading image to Etsy...");
    const etsyResponse = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/images`, 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': process.env.ETSY_CLIENT_ID as string,
        },
        body: etsyFormData,
        // Timeout ayarı ekle
        signal: AbortSignal.timeout(30000) // 30 saniye timeout
      }
    );

    // Get response details
    const responseStatus = etsyResponse.status;
    const responseStatusText = etsyResponse.statusText;
    let responseData;
    
    try {
      responseData = await etsyResponse.json();
    console.log("[IMAGE_UPLOAD_API] Etsy response:", {
      status: responseStatus,
      statusText: responseStatusText,
        data: responseData
    });
    } catch (e) {
      const responseText = await etsyResponse.text();
      console.error("[IMAGE_UPLOAD_API] Failed to parse JSON response:", responseText);
      responseData = { text: responseText };
    }

    if (!etsyResponse.ok) {
      console.error("[IMAGE_UPLOAD_API] Etsy upload failed:", responseData);
      return NextResponse.json({
        error: `Resim yükleme başarısız: ${responseStatus} ${responseStatusText}`,
        details: responseData,
        success: false
      }, { status: responseStatus });
    }

    // Get uploaded image ID
    const uploadedImageId = responseData?.listing_image_id || responseData?.data?.listing_image_id;
    if (!uploadedImageId) {
      console.error("[IMAGE_UPLOAD_API] No image ID in response:", responseData);
      return NextResponse.json({
        error: "Resim yüklendi ancak ID alınamadı",
        details: responseData,
        success: false
      }, { status: 500 });
    }

    // Verify upload with retries
    console.log("[IMAGE_UPLOAD_API] Verifying image upload...");
    let imageVerified = false;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 5000; // 5 saniye

    while (!imageVerified && retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));

      try {
    const verifyResponse = await fetch(
      `https://openapi.etsy.com/v3/application/listings/${listingId}/images`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': process.env.ETSY_CLIENT_ID as string,
        }
      }
    );

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
          imageVerified = verifyData.results?.some((img: any) => img.listing_image_id === uploadedImageId);
      
          if (imageVerified) {
            console.log("[IMAGE_UPLOAD_API] Image verified successfully");
            break;
          }
        }
      } catch (error) {
        console.warn("[IMAGE_UPLOAD_API] Verification attempt failed:", error);
      }
      
      retryCount++;
      console.log(`[IMAGE_UPLOAD_API] Retry ${retryCount}/${maxRetries}`);
    }

    if (!imageVerified) {
      console.warn("[IMAGE_UPLOAD_API] Could not verify image upload after retries");
          }

    return NextResponse.json({
      success: true,
      message: imageVerified ? "Resim başarıyla yüklendi ve doğrulandı" : "Resim yüklendi fakat doğrulanamadı",
      listing_image_id: uploadedImageId
    });

  } catch (error) {
    console.error("[IMAGE_UPLOAD_API] Unexpected error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu",
      success: false
    }, { 
      status: 500, 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

// Add OPTIONS method handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      'Access-Control-Max-Age': '86400' // 24 hours
    }
  });
} 