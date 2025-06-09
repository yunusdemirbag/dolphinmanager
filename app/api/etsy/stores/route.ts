import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEtsyStores, getStoresFromDatabase } from "@/lib/etsy-api"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Etsy stores API auth error:", userError);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // API isteği parametreleri
    const skipCache = request.headers.get('X-Skip-Cache') === 'true';
    console.log(`Fetching Etsy stores for user: ${user.id}, Skip cache: ${skipCache}`);

    try {
      // Etsy mağazalarını getir
      const stores = await getEtsyStores(user.id);
      
      return NextResponse.json({
        success: true,
        stores
      });
    } catch (error: any) {
      console.error("Etsy stores API error:", error);
      
      // OAuth2 yeniden bağlantı gerektiren hata kontrolü
      if (error.message === 'RECONNECT_REQUIRED') {
        return NextResponse.json(
          { 
            error: "OAuth2 token expired or invalid", 
            reconnectRequired: true 
          }, 
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { 
          error: error.message || "Failed to get Etsy stores",
          details: error.details || null
        }, 
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Etsy stores API server error:", error);
    
    return NextResponse.json(
      { error: "Server error" }, 
      { status: 500 }
    );
  }
} 