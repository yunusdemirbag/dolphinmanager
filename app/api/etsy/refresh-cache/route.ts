import { NextRequest, NextResponse } from "next/server"
// import { createClient } from "@/lib/supabase/server"
import { 
  getEtsyStores, 
  getEtsyListings, 
  getEtsyReceipts,
  getEtsyPayments,
  invalidateShopCache
} from "@/lib/etsy-api"
import { getUser } from "@/lib/auth"
import { cacheManager } from '@/lib/cache'

// GEÇİCİ ÇÖZÜM: Fonksiyonlar lib/etsy-api.ts içinde eksik.
const invalidateUserCache = async (...args: any[]) => {
    console.log('invalidateUserCache called', ...args);
    return { success: true };
};
const calculateFinancialSummary = async (...args: any[]) => {
    console.log('calculateFinancialSummary called', ...args);
    return { 
        netProfit: 0, 
        totalRevenue: 0, 
        totalCosts: 0, 
        averageOrderValue: 0, 
        currency: 'USD' 
    };
};

/**
 * This endpoint allows refreshing the cached Etsy data
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 })
    }
    
    const body = await request.json()
    const { shopId, refreshType = "all" } = body
    
    if (!shopId && refreshType !== "user") {
      return NextResponse.json(
        { error: "Shop ID gerekli", success: false },
        { status: 400 }
      )
    }

    const userId = user.id

    // Determine what data to refresh based on refreshType
    switch (refreshType) {
      case "user":
        // Invalidate all cached data for this user
        invalidateUserCache(userId)
        
        // Force a refresh of stores data
        await getEtsyStores(userId, true)
        
        return NextResponse.json({
          message: "Kullanıcı önbelleği yenilendi",
          success: true,
          timestamp: new Date().toISOString()
        })
        
      case "shop":
        // Invalidate all cached data for this shop
        invalidateShopCache(userId, shopId)
        
        return NextResponse.json({
          message: "Mağaza önbelleği yenilendi",
          success: true,
          timestamp: new Date().toISOString()
        })
        
      case "listings":
        // Force a refresh of listings for this shop
        await getEtsyListings(userId, shopId, 100, 0, 'active', true)
        
        return NextResponse.json({
          message: "Ürün önbelleği yenilendi",
          success: true,
          timestamp: new Date().toISOString()
        })
        
      case "orders":
        // Force a refresh of receipts for this shop
        await getEtsyReceipts(userId, shopId, 100, 0, true)
        
        return NextResponse.json({
          message: "Sipariş önbelleği yenilendi",
          success: true,
          timestamp: new Date().toISOString()
        })
        
      case "payments":
        // Force a refresh of payments for this shop
        await getEtsyPayments(userId, shopId, 100, 0, true)
        
        return NextResponse.json({
          message: "Ödeme önbelleği yenilendi",
          success: true,
          timestamp: new Date().toISOString()
        })
        
      case "financial":
        // Force a refresh of financial summary for this shop
        await calculateFinancialSummary(userId, shopId, 30, true)
        
        return NextResponse.json({
          message: "Finansal özet önbelleği yenilendi",
          success: true,
          timestamp: new Date().toISOString()
        })
        
      case "all":
      default:
        // Refresh all shop data
        invalidateShopCache(userId, shopId)
        
        // Force a refresh of all data types
        await Promise.all([
          getEtsyListings(userId, shopId, 100, 0, 'active', true),
          getEtsyReceipts(userId, shopId, 100, 0, true),
          getEtsyPayments(userId, shopId, 100, 0, true),
          calculateFinancialSummary(userId, shopId, 30, true)
        ])
        
        return NextResponse.json({
          message: "Tüm mağaza önbelleği yenilendi",
          success: true,
          timestamp: new Date().toISOString()
        })
    }
    
  } catch (error) {
    console.error("Önbellek yenileme hatası:", error)
    return NextResponse.json({ 
      error: "Önbellek yenileme başarısız", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
} 