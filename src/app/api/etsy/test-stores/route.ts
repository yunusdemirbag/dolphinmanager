import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "Firebase geçişi sonrası mock endpoint - Etsy test stores",
      stores: []
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Firebase geçişi sonrası mock endpoint",
      details: "Test stores API Firebase ile entegre edilecek"
    }, { status: 200 });
  }
}