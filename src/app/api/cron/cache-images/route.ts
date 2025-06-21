import { NextResponse } from 'next/server';

export const maxDuration = 60; // Vercel Hobby plan limit

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      success: true,
      message: "Firebase geçişi sonrası mock endpoint - resim önbellek cron",
      results: {
        cached: 0,
        skipped: 0,
        failed: 0,
        duration: 0
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Firebase geçişi sonrası mock endpoint",
      details: "Cache images cron Firebase ile entegre edilecek"
    }, { status: 200 });
  }
}