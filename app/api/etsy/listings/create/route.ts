import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDraftListing, getEtsyStores, CreateListingData } from "@/lib/etsy-api"

export async function POST(request: NextRequest) {
  try {
    // Modern Supabase client oluştur - await ile bekle
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Yetkilendirme hatası:", userError)
      return NextResponse.json({ error: "Unauthorized", details: userError?.message }, { status: 401 })
    }

    // Request body'yi parse et
    const listingData: CreateListingData = await request.json()

    // Başlık uzunluğunu kontrol et (Etsy limiti 140 karakter)
    if (listingData.title && listingData.title.length > 140) {
      listingData.title = listingData.title.substring(0, 140);
      console.log("Başlık Etsy limiti olan 140 karaktere kısaltıldı:", listingData.title);
    }

    console.log("Creating listing for user:", user.id, "Data:", JSON.stringify(listingData))

    // Etsy store bilgilerini çek
    const etsyStores = await getEtsyStores(user.id, true) // skipCache=true ile her zaman taze veri al
    
    if (etsyStores.length === 0) {
      return NextResponse.json({
        error: "No Etsy stores connected",
        message: "Please connect your Etsy store first"
      }, { status: 400 })
    }

    const primaryStore = etsyStores[0] // İlk mağazayı kullan
    console.log("Creating listing for store:", primaryStore.shop_name)

    // image_ids konsola yazdır
    if (listingData.image_ids && listingData.image_ids.length > 0) {
      console.log("Listing will use image IDs:", listingData.image_ids);
    }

    try {
      // Listing oluştur
      const newListing = await createDraftListing(user.id, primaryStore.shop_id, listingData)

      console.log("Listing created successfully:", newListing.listing_id)

      return NextResponse.json({
        success: true,
        listing: newListing,
        message: "Listing created successfully"
      })
    } catch (createError: any) {
      console.error("Create listing error:", createError.message);
      
      // Etsy API yanıt hatalarını daha detaylı işle
      let errorDetails = createError.message || "Unknown error";
      let statusCode = 400;
      
      // Bad Request (title too long gibi format hataları) için
      if (errorDetails.includes("Bad Request")) {
        statusCode = 400;
      }
      
      // Unauthorized hatalarını yakala
      if (errorDetails.includes("Unauthorized") || 
          errorDetails.includes("401") ||
          errorDetails.includes("token")) {
        statusCode = 401;
        errorDetails = "Etsy authorization required. Please reconnect your Etsy account.";
      }
      
      return NextResponse.json(
        { 
          error: "Failed to create listing", 
          details: errorDetails,
          success: false
        },
        { status: statusCode }
      )
    }
  } catch (error: any) {
    console.error("Create listing API error:", error)
    
    // Etsy API yanıt hatalarını daha detaylı işle
    let errorDetails = error.message || "Unknown error";
    let statusCode = 500;
    
    // Bad Request (title too long gibi format hataları) için
    if (error.message && error.message.includes("Bad Request")) {
      statusCode = 400;
    }
    
    // Unauthorized hatalarını yakala
    if (error.message && (
      error.message.includes("Unauthorized") || 
      error.message.includes("401") ||
      error.message.includes("token")
    )) {
      statusCode = 401;
      errorDetails = "Etsy authorization required. Please reconnect your Etsy account.";
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create listing", 
        details: errorDetails,
        success: false
      },
      { status: statusCode }
    )
  }
} 