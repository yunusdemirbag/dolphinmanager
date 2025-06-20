import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "Firebase geçişi sonrası mock endpoint - Etsy stores",
      stores: [],
      count: 0
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: "Firebase geçişi sonrası mock endpoint",
      details: "Etsy stores API Firebase ile entegre edilecek",
      success: false
    }, { status: 200 });
  }
}