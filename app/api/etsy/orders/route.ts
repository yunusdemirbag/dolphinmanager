import { NextRequest, NextResponse } from "next/server";
import { getEtsyReceipts } from "@/lib/etsy-api";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Kullanıcı doğrulama
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log("Orders API auth error:", userError, "No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parametreleri al
    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get("shopId") || "1"; // Varsayılan mağaza ID'si
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    console.log(`Fetching Etsy orders for user: ${user.id}, shop: ${shopId}, page: ${page}, limit: ${limit}`);

    try {
      // Önce gerçek Etsy API'sini dene
      const { receipts, count } = await getEtsyReceipts(user.id, parseInt(shopId), limit, offset);
      
      if (receipts && receipts.length > 0) {
        console.log("✅ Real Etsy receipts found:", receipts.length);
        
        // Basitleştirilmiş sipariş verileri oluştur
        const orders = receipts.map(receipt => ({
          order_id: receipt.receipt_id,
          shop_id: parseInt(shopId),
          buyer_name: receipt.name || "Müşteri",
          order_total: receipt.grandtotal?.amount / (receipt.grandtotal?.divisor || 100),
          currency_code: receipt.grandtotal?.currency_code || "USD",
          status: receipt.is_paid ? (receipt.is_shipped ? "completed" : "paid") : "pending",
          created_at: new Date(receipt.create_timestamp * 1000).toISOString(),
          updated_at: new Date(receipt.update_timestamp * 1000).toISOString(),
          items_count: 1, // Varsayılan değer
          shipping_address: `${receipt.first_line}, ${receipt.city}, ${receipt.state}, ${receipt.zip}, ${receipt.country_iso}`
        }));
        
        return NextResponse.json({
          orders,
          pagination: {
            total: count,
            limit,
            offset,
            page,
            pages: Math.ceil(count / limit)
          },
          source: "etsy_api"
        });
      }
    } catch (etsyError) {
      console.error("Etsy Receipts API error:", etsyError);
    }

    // API hatası durumunda veritabanından verileri çekmeye çalış
    try {
      const { data: orders, error: ordersError, count } = await supabase
        .from("orders")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (ordersError) {
        console.error("Database orders error:", ordersError);
      }

      if (orders && orders.length > 0) {
        console.log("📦 Using database orders:", orders.length);
        return NextResponse.json({
          orders,
          pagination: {
            total: count || orders.length,
            limit,
            offset,
            page,
            pages: Math.ceil((count || orders.length) / limit)
          },
          source: "database"
        });
      }
    } catch (dbError) {
      console.error("Database orders fetch error:", dbError);
    }

    // Demo/mock sipariş oluşturma ve döndürme kodları kaldırıldı
    // Eğer veri yoksa boş dizi dön
    return NextResponse.json({
      orders: [],
      pagination: {
        total: 0,
        limit,
        offset,
        page,
        pages: 0
      },
      source: "none",
      message: "Hiçbir sipariş bulunamadı."
    });
    
  } catch (error: any) {
    console.error("Orders API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch orders", 
        details: error.message,
        orders: []
      },
      { status: 500 }
    );
  }
} 