import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const { shopId, data } = await request.json();

    return NextResponse.json({
      success: true,
      message: "Firebase geçişi sonrası mock endpoint - shop update",
      shop: data
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Firebase geçişi sonrası mock endpoint",
      details: "Shop update API Firebase ile entegre edilecek",
      success: false
    }, { status: 200 });
  }
}