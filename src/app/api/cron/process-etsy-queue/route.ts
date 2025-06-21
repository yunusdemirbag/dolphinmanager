import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; // Vercel Hobby plan limit

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "Firebase geçişi sonrası mock endpoint - Etsy kuyruk işleme",
      processed: 0,
      results: []
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Firebase geçişi sonrası mock endpoint",
      error: "Cron job Firebase ile entegre edilecek"
    }, { status: 200 });
  }
}