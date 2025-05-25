import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Resetting Etsy connection for user:", user.id)

    // 1. Etsy token'ları sil
    const { error: tokenError } = await supabaseAdmin
      .from("etsy_tokens")
      .delete()
      .eq("user_id", user.id)

    if (tokenError) {
      console.error("Error deleting tokens:", tokenError)
    } else {
      console.log("Etsy tokens deleted successfully")
    }

    // 2. Auth session'ları sil
    const { error: sessionError } = await supabaseAdmin
      .from("etsy_auth_sessions")
      .delete()
      .eq("user_id", user.id)

    if (sessionError) {
      console.error("Error deleting auth sessions:", sessionError)
    } else {
      console.log("Auth sessions deleted successfully")
    }
    
    // 3. Etsy mağaza verilerini sil
    const { error: storeError } = await supabaseAdmin
      .from("etsy_stores")
      .delete()
      .eq("user_id", user.id)
      
    if (storeError) {
      console.error("Error deleting store data:", storeError)
    } else {
      console.log("Store data deleted successfully")
    }
    
    // 4. Etsy ürün verilerini sil (eğer etsy_listings tablosu varsa)
    try {
      const { error: listingsError } = await supabaseAdmin
        .from("etsy_listings")
        .delete()
        .eq("user_id", user.id)
        
      if (listingsError) {
        console.error("Error deleting listing data:", listingsError)
      } else {
        console.log("Listing data deleted successfully")
      }
    } catch (listingsTableError) {
      console.log("Listings table might not exist yet:", listingsTableError)
    }

    // 5. Profile'daki Etsy bilgilerini temizle
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        etsy_shop_name: null,
        etsy_shop_id: null
      })
      .eq("id", user.id)

    if (profileError) {
      console.error("Error clearing profile:", profileError)
    } else {
      console.log("Profile Etsy data cleared successfully")
    }

    console.log("Etsy connection reset completed successfully")

    return NextResponse.json({ 
      success: true, 
      message: "Etsy bağlantısı başarıyla sıfırlandı" 
    })

  } catch (error) {
    console.error("Reset error:", error)
    return NextResponse.json(
      { 
        error: "Reset failed", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
} 