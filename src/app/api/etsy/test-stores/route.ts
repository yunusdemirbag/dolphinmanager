import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("Etsy test-stores API called");
    
    // Basit bir yanıt döndür
    return NextResponse.json({
      success: true,
      message: "Firebase veritabanı kontrolü - basit test",
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in test endpoint:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal Server Error', 
        details: error.message 
      }),
      { status: 500 },
    );
  }
}