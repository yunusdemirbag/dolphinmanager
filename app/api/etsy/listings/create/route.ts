import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDraftListing, getEtsyStores, CreateListingData } from "@/lib/etsy-api"

export async function POST(request: NextRequest) {
  try {
    // Kullanıcıyı doğrula
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Create listing API auth error:", userError)
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      )
    }
    
    // İstek gövdesinden verileri al
    const listingData = await request.json()
    
    try {
      // Etsy mağazalarını al
      const etsyStores = await getEtsyStores(user.id)
      
      if (!etsyStores || etsyStores.length === 0) {
        return NextResponse.json(
          { error: "No Etsy stores found" }, 
          { status: 400 }
        )
      }
      
      // İlk mağazayı kullan
      const shopName = etsyStores[0].shop_name
      console.log(`Creating listing for store: ${shopName}`)
      
      // Eksik alanları kontrol et ve varsayılan değerler ata
      if (!listingData.title || listingData.title.trim() === '') {
        listingData.title = 'New Canvas Print'; // Varsayılan başlık
      }
      
      if (!listingData.description || listingData.description.trim() === '') {
        listingData.description = 'Beautiful canvas print for your home decoration.'; // Varsayılan açıklama
      }
      
      // Dil bilgisinin her zaman ayarlandığından emin ol
      listingData.language = listingData.language || 'en'; // Varsayılan dil
      
      // Fiyat kontrolü - fiyat yoksa veya hatalıysa varsayılan değer ata
      if (!listingData.price || !listingData.price.amount) {
        listingData.price = {
          amount: 100, // 1 USD varsayılan değer
          divisor: 100,
          currency_code: "USD"
        };
        console.log("Fiyat belirtilmediği veya geçersiz olduğu için varsayılan fiyat ayarlandı: 1 USD");
      }

      // shipping_profile_id zorunlu kontrolü
      if (!listingData.shipping_profile_id) {
        return NextResponse.json({
          error: "Kargo profili seçilmeden ürün eklenemez.",
          details: "shipping_profile_id zorunludur.",
          success: false
        }, { status: 400 });
      }

      console.log("Creating listing for user:", user.id, "Data:", JSON.stringify(listingData))

      // image_ids konsola yazdır
      if (listingData.image_ids && listingData.image_ids.length > 0) {
        console.log("Listing will use image IDs:", listingData.image_ids);
      }

      // Listing'i oluştur
      const primaryStore = etsyStores[0];
      const listing = await createDraftListing(user.id, primaryStore.shop_id, listingData)
      
      return NextResponse.json({
        success: true,
        listing_id: listing.listing_id,
        message: "Listing created successfully"
      })
    } catch (error: any) {
      console.error("Create listing error:", error.message || error)
      
      return NextResponse.json(
        { 
          error: error.message || "Failed to create listing",
          details: error.details || null
        }, 
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Create listing API error:", error)
    
    return NextResponse.json(
      { error: "Server error" }, 
      { status: 500 }
    )
  }
} 