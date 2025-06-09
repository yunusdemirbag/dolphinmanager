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
    const body = await request.json()
    
    // taxonomy_id'yi number'a çevir
    if (body.taxonomy_id) {
      // Geçici olarak devre dışı bırakıldı, taxonomy_id hatası nedeniyle
      // body.taxonomy_id = Number(body.taxonomy_id);
      body.taxonomy_id = 1027; // Home & Living > Home Decor > Wall Decor
    } else {
      body.taxonomy_id = 1027; // Home & Living > Home Decor > Wall Decor
    }
    
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
      if (!body.title || body.title.trim() === '') {
        body.title = 'New Canvas Print'; // Varsayılan başlık
      }
      
      if (!body.description || body.description.trim() === '') {
        body.description = 'Beautiful canvas print for your home decoration.'; // Varsayılan açıklama
      }
      
      // Dil bilgisinin her zaman ayarlandığından emin ol
      body.language = body.language || 'en'; // Varsayılan dil
      
      // Fiyat kontrolü - fiyat yoksa veya hatalıysa varsayılan değer ata
      if (!body.price || !body.price.amount) {
        body.price = {
          amount: 100, // 1 USD varsayılan değer
          divisor: 100,
          currency_code: "USD"
        };
        console.log("Fiyat belirtilmediği veya geçersiz olduğu için varsayılan fiyat ayarlandı: 1 USD");
      }

      // shipping_profile_id zorunlu kontrolü
      if (!body.shipping_profile_id) {
        return NextResponse.json({
          error: "Kargo profili seçilmeden ürün eklenemez.",
          details: "shipping_profile_id zorunludur.",
          success: false
        }, { status: 400 });
      }

      console.log("Creating listing for user:", user.id, "Data:", JSON.stringify(body))

      // image_ids konsola yazdır
      if (body.image_ids && body.image_ids.length > 0) {
        console.log("Listing will use image IDs:", body.image_ids);
      }

      // Listing'i oluştur
      const primaryStore = etsyStores[0];
      const listing = await createDraftListing(user.id, primaryStore.shop_id, body)
      
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