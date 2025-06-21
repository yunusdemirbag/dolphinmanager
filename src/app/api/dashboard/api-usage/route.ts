import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Firebase geçişi sonrası mock API usage data
    return NextResponse.json({
      totalRequests: 150,
      dailyAverage: 21,
      popularEndpoints: [
        { endpoint: "/api/etsy/listings", count: 45 },
        { endpoint: "/api/etsy/stores", count: 32 },
        { endpoint: "/api/ai/generate-title", count: 28 }
      ],
      recentActivity: []
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: "API kullanım bilgileri alınamadı" },
      { status: 500 }
    )
  }
}