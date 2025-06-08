import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getShopSections, getEtsyStores } from "@/lib/etsy-api"

// Mock data for development/testing
const MOCK_SHOP_SECTIONS = [
  { shop_section_id: 0, title: "Home", rank: 0, user_id: 123, active_listing_count: 0 },
  { shop_section_id: 1, title: "Woman Art", rank: 1, user_id: 123, active_listing_count: 10 },
  { shop_section_id: 2, title: "Abstract Art", rank: 2, user_id: 123, active_listing_count: 5 },
  { shop_section_id: 3, title: "Love Art", rank: 3, user_id: 123, active_listing_count: 8 },
  { shop_section_id: 4, title: "Flowers Art", rank: 4, user_id: 123, active_listing_count: 12 },
  { shop_section_id: 5, title: "Landscape Art", rank: 5, user_id: 123, active_listing_count: 7 }
];

export async function GET(request: NextRequest) {
  try {
    // Modern Supabase client oluştur
    const supabase = await createClient()
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Shop sections API auth error:", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id;
    
    // Extract shopId from query parameters if needed
    const { searchParams } = new URL(request.url);
    const shopIdParam = searchParams.get('shopId');
    const useMockData = searchParams.get('mock') === 'true';
    
    let shopId: number | undefined;
    
    if (shopIdParam) {
      shopId = parseInt(shopIdParam);
      if (isNaN(shopId)) {
        return NextResponse.json({ 
          error: "Invalid shop ID", 
          success: false 
        }, { status: 400 });
      }
    } else {
      // No shop ID provided, try to get user's first store
      try {
        const stores = await getEtsyStores(userId, true);
        if (stores && stores.length > 0) {
          shopId = stores[0].shop_id;
        }
      } catch (error) {
        console.error("Error getting user's stores:", error);
      }
      
      if (!shopId) {
        return NextResponse.json({ 
          error: "No Etsy stores found for this user", 
          success: false,
          reconnect_required: true
        }, { status: 404 });
      }
    }
    
    let sections;
    
    if (useMockData) {
      // Test için mock data kullan
      sections = MOCK_SHOP_SECTIONS;
    } else {
      try {
        // Gerçek Etsy API'den bölümleri al
        const apiSections = await getShopSections(userId, shopId);
        
        // "Home" bölümünü manuel olarak ekle (Etsy'de varsayılan olarak bulunmaz)
        sections = [
          { shop_section_id: 0, title: "Home", rank: 0, user_id: 0, active_listing_count: 0 },
          ...apiSections
        ];
      } catch (error) {
        console.error("Error fetching shop sections from API:", error);
        // API hatası durumunda mock data kullan
        sections = MOCK_SHOP_SECTIONS;
      }
    }
    
    // Add cache-control header to prevent browser caching
    const headers = new Headers();
    headers.append('Cache-Control', 'no-store, must-revalidate');
    headers.append('Pragma', 'no-cache');
    headers.append('Expires', '0');
    
    return NextResponse.json({
      success: true,
      sections,
      shop_id: shopId
    }, { headers });

  } catch (error: any) {
    console.error("Shop sections API error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const reconnectRequired = errorMessage === 'RECONNECT_REQUIRED';
    
    return NextResponse.json(
      { 
        error: "Failed to fetch shop sections", 
        details: errorMessage,
        success: false,
        reconnect_required: reconnectRequired
      },
      { status: reconnectRequired ? 401 : 500 }
    );
  }
} 