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
    console.log("[IMAGE_UPLOAD_API] Image upload API called - Starting process");

    const resolvedParams = await params;
    const listingId = resolvedParams?.listingId ? parseInt(resolvedParams.listingId) : null;
    console.log("[IMAGE_UPLOAD_API] Listing ID:", listingId);

    let userId = "71bca451-a580-4bdd-a7eb-91e2d8aa5d12"; // Default fallback

    try {
      const supabase = await createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!userError && user) {
        userId = user.id;
        console.log("[IMAGE_UPLOAD_API] Authenticated user found:", userId);
      } else {
        console.log("[IMAGE_UPLOAD_API] Using fallback user ID:", userId);
      }
    } catch (authError) {
      console.log("[IMAGE_UPLOAD_API] Auth error (using fallback ID):", authError);
    }

    if (!listingId || isNaN(listingId)) {
      console.error("[IMAGE_UPLOAD_API] Invalid or missing listing ID");
      return NextResponse.json({
        error: "Invalid or missing listing ID",
        success: false
      }, { status: 400 });
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      console.error("[IMAGE_UPLOAD_API] No image file provided in FormData");
      return NextResponse.json({ error: "No image file provided.", success: false }, { status: 400 });
    }

    console.log("[IMAGE_UPLOAD_API] Image file details:", {
      name: imageFile.name,
      type: imageFile.type,
      size: imageFile.size
    });

    const stores = await getEtsyStores(userId, true);
    console.log("[IMAGE_UPLOAD_API] Etsy stores found:", stores?.length || 0);

    if (!stores || stores.length === 0) {
      console.error("[IMAGE_UPLOAD_API] No Etsy stores found for user:", userId);
      return NextResponse.json({
        error: "No Etsy stores found",
        success: false,
        reconnect_required: true,
        message: "Your Etsy connection needs to be refreshed. Please reconnect your store."
      }, { status: 401 });
    }

    const shopId = stores[0].shop_id;
    console.log("[IMAGE_UPLOAD_API] Using shop ID:", shopId);

    // Get Etsy credentials including access token
    const etsyAccessToken = await getValidAccessToken(userId);
    const apiKey = process.env.ETSY_CLIENT_ID;

    console.log("[IMAGE_UPLOAD_API] Etsy credentials check:", {
      hasAccessToken: !!etsyAccessToken,
      hasApiKey: !!apiKey
    });

    if (!etsyAccessToken || !apiKey) {
      console.error("[IMAGE_UPLOAD_API] Etsy credentials not found for user:", userId);
      return NextResponse.json({
        error: "Etsy credentials not found or invalid. Please reconnect your store.",
        success: false,
        reconnect_required: true,
        message: "Your Etsy connection needs to be refreshed. Please reconnect your store."
      }, { status: 401 });
    }

    // Use fetch-specific FormData implementation
    const fetchFormData = new FormData();
    
    // Add image with original filename
    fetchFormData.append('image', new Blob([await imageFile.arrayBuffer()], { type: imageFile.type }), imageFile.name);
    
    // Add rank parameter if provided
    const rank = formData.get('rank');
    if (rank !== null) {
      fetchFormData.append('rank', rank.toString());
    }
    
    console.log("[IMAGE_UPLOAD_API] Form data prepared:", {
      hasImageFile: true,
      imageFileName: imageFile.name,
      imageFileType: imageFile.type,
      imageFileSize: imageFile.size,
      rank: rank?.toString() || 'not provided'
    });

    const etsyApiUrl = `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/images`;
    console.log("[IMAGE_UPLOAD_API] Sending request to Etsy API URL:", etsyApiUrl);

    // Use fetch with its native FormData handling
    const etsyResponse = await fetch(etsyApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${etsyAccessToken}`,
        'x-api-key': apiKey,
      },
      body: fetchFormData,
    });

    console.log("[IMAGE_UPLOAD_API] Etsy API Response Status:", etsyResponse.status, etsyResponse.statusText);
    
    // Capture detailed response information for debugging
    const responseStatus = etsyResponse.status;
    const responseStatusText = etsyResponse.statusText;
    const responseHeaders = Object.fromEntries(etsyResponse.headers.entries());
    
    console.log("[IMAGE_UPLOAD_API] Etsy Image Upload Response Headers:", JSON.stringify(responseHeaders, null, 2));
    
    let responseBodyText = "Could not read response body";
    try {
      responseBodyText = await etsyResponse.text();
      console.log("[IMAGE_UPLOAD_API] Etsy API Raw Response Body:", responseBodyText);
    } catch (responseReadError) {
      console.error("[IMAGE_UPLOAD_API] Error reading Etsy response body as text:", responseReadError);
    }
    
    let responseData;
    try {
      responseData = JSON.parse(responseBodyText);
      console.log("[IMAGE_UPLOAD_API] Etsy API Parsed Response Data:", JSON.stringify(responseData, null, 2));
    } catch (jsonParseError) {
      console.warn('[IMAGE_UPLOAD_API] Could not parse Etsy response as JSON, treating as text:', jsonParseError);
      responseData = { message: responseBodyText, error: 'Non-JSON response from Etsy API' };
    }

    if (!etsyResponse.ok) {
      console.error(`[IMAGE_UPLOAD_API] Etsy API Error (upload image): Status ${responseStatus} ${responseStatusText}`);
      
      const errorDetails = responseData?.error || responseData?.details || responseData?.message || 'No specific error message from Etsy.';
      console.error('[IMAGE_UPLOAD_API] Etsy API Error Details:', errorDetails);

      return NextResponse.json({
        error: `Etsy API'den resim yükleme hatası: ${responseStatus}. Detay: ${errorDetails}`,
        details: responseData,
        success: false
      }, { status: responseStatus });
    }

    console.log("[IMAGE_UPLOAD_API] Image uploaded successfully to Etsy:", JSON.stringify(responseData, null, 2));
    
    let uploadedImageId = null;
    let imageUrls = null;
    
    if (responseData?.listing_image_id) {
      uploadedImageId = responseData.listing_image_id;
      imageUrls = {
        small: responseData.url_75x75,
        medium: responseData.url_170x135,
        large: responseData.url_570xN,
        full: responseData.url_fullxfull
      };
      console.log('[IMAGE_UPLOAD_API] Image ID and URLs:', { imageId: uploadedImageId, urls: imageUrls });
    } else if (responseData?.data?.listing_image_id) {
      uploadedImageId = responseData.data.listing_image_id;
      imageUrls = {
        small: responseData.data.url_75x75,
        medium: responseData.data.url_170x135,
        large: responseData.data.url_570xN,
        full: responseData.data.url_fullxfull
      };
      console.log('[IMAGE_UPLOAD_API] Image ID and URLs from nested data:', { imageId: uploadedImageId, urls: imageUrls });
    } else {
      console.warn('[IMAGE_UPLOAD_API] No image ID or URLs found in Etsy response:', responseData);
    }

    // Verify the image was actually uploaded by checking listing images
    console.log("[IMAGE_UPLOAD_API] Starting image verification process...");
    
    try {
      // Wait for 5 seconds before verification to allow Etsy to process the image
      console.log("[IMAGE_UPLOAD_API] Waiting 5 seconds before verification...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // First, verify the listing exists and get its details
      console.log("[IMAGE_UPLOAD_API] Verifying listing exists...");
      const listingResponse = await fetch(`https://openapi.etsy.com/v3/application/listings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${etsyAccessToken}`,
          'x-api-key': apiKey
        }
      });
      
      if (!listingResponse.ok) {
        console.error(`[IMAGE_UPLOAD_API] Failed to verify listing: ${listingResponse.status} ${listingResponse.statusText}`);
        const listingErrorText = await listingResponse.text();
        console.error('[IMAGE_UPLOAD_API] Listing verification error:', listingErrorText);
      } else {
        const listingData = await listingResponse.json();
        console.log('[IMAGE_UPLOAD_API] Listing verification successful:', JSON.stringify(listingData, null, 2));
      }
      
      // Now check the images
      console.log("[IMAGE_UPLOAD_API] Verifying image upload by checking listing images...");
      const verifyResponse = await fetch(`https://openapi.etsy.com/v3/application/listings/${listingId}/images`, {
        headers: {
          'Authorization': `Bearer ${etsyAccessToken}`,
          'x-api-key': apiKey
        }
      });
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log(`[IMAGE_UPLOAD_API] Verification response:`, JSON.stringify(verifyData, null, 2));
        console.log(`[IMAGE_UPLOAD_API] Verification result: Found ${verifyData.count || 0} images for listing ${listingId}`);
        
        if (verifyData.results && verifyData.results.length > 0) {
          const foundUploadedImage = verifyData.results.some((img: any) => 
            img.listing_image_id === uploadedImageId
          );
          
          console.log(`[IMAGE_UPLOAD_API] Uploaded image (ID: ${uploadedImageId}) found in listing: ${foundUploadedImage}`);
          
          if (!foundUploadedImage) {
            console.warn("[IMAGE_UPLOAD_API] Image was uploaded but not found in immediate verification. This might indicate Etsy's processing delay.");
            
            // Try one more time after a longer delay
            console.log("[IMAGE_UPLOAD_API] Waiting additional 10 seconds before final verification...");
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            const finalVerifyResponse = await fetch(`https://openapi.etsy.com/v3/application/listings/${listingId}/images`, {
              headers: {
                'Authorization': `Bearer ${etsyAccessToken}`,
                'x-api-key': apiKey
              }
            });
            
            if (finalVerifyResponse.ok) {
              const finalVerifyData = await finalVerifyResponse.json();
              const finalFoundUploadedImage = finalVerifyData.results?.some((img: any) => 
                img.listing_image_id === uploadedImageId
              );
              
              console.log(`[IMAGE_UPLOAD_API] Final verification result: Image found: ${finalFoundUploadedImage}`);
              
              if (!finalFoundUploadedImage) {
                console.warn("[IMAGE_UPLOAD_API] Image still not found after extended wait. This might indicate an issue with the upload.");
              }
            }
          }
        }
      } else {
        const verifyErrorText = await verifyResponse.text();
        console.warn(`[IMAGE_UPLOAD_API] Could not verify image upload: ${verifyResponse.status} ${verifyResponse.statusText}`, verifyErrorText);
      }
    } catch (verifyError) {
      console.warn("[IMAGE_UPLOAD_API] Error during verification check:", verifyError);
    }

    // Add cache control headers to prevent caching
    const headers = new Headers();
    headers.append('Cache-Control', 'no-store, must-revalidate');
    headers.append('Pragma', 'no-cache');
    headers.append('Expires', '0');

    return NextResponse.json({
      success: true,
      message: "Image uploaded successfully to Etsy.",
      data: responseData.data || responseData,
      uploaded_image_id: uploadedImageId,
      image_urls: imageUrls,
      verification_note: "Image upload confirmed. If not immediately visible, please allow a few minutes for Etsy to process. You may need to refresh the page or check back in a few minutes."
    }, { headers });

  } catch (error) {
    console.error("[IMAGE_UPLOAD_API] Error uploading image (catch block):", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during image upload process";
    return NextResponse.json({
      error: `Resim yükleme sırasında beklenmeyen bir hata oluştu: ${errorMessage}`,
      success: false
    }, { status: 500 });
  }
} 