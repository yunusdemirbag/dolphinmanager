import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server"
import { getValidAccessToken, getEtsyStores, getShopSections } from "@/lib/etsy-api"

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse("Yetkisiz", { status: 401 });

    const accessToken = await getValidAccessToken(user.id);
    const stores = await getEtsyStores(user.id, true);
    if (!accessToken || !stores?.length) throw new Error("Etsy mağaza bağlantısı bulunamadı.");
    
    const shopId = stores[0].shop_id;
    const sections = await getShopSections(accessToken, shopId);
    
    return NextResponse.json({ sections });
  } catch (error) {
    console.error("[SHOP_SECTIONS_API] Hata:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 